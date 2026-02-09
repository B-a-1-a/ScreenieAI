use std::time::Duration;

use serde::de::DeserializeOwned;
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    models::{
        ChatRole, ChatTurn, InterviewTurn, PlanInput, PlanOutput, ScreenSeed, ScreenType,
        WireframeEditInput, WireframeInput, WireframeOutput,
    },
};

const TEXT_MODEL: &str = "google/gemini-2.5-flash-preview:free";
const IMAGE_MODEL: &str = "google/gemini-2.5-flash-preview-image:free";
const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES: usize = 3;

pub struct OpenRouterService {
    client: reqwest::Client,
}

impl OpenRouterService {
    pub fn new() -> AppResult<Self> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()?;
        Ok(Self { client })
    }

    pub async fn run_interview_turn(
        &self,
        api_key: &str,
        project_context: &str,
        history: &[ChatTurn],
        system_prompt: &str,
    ) -> AppResult<InterviewTurn> {
        let history_text = format_history(history);
        let user_prompt = format!(
            "Project context:\n{}\n\nConversation so far:\n{}\n\nReturn one JSON object only.",
            project_context, history_text
        );

        let response_text = self
            .chat_completion(TEXT_MODEL, api_key, system_prompt, &user_prompt)
            .await?;

        let mut turn: InterviewTurn = match parse_json(&response_text) {
            Ok(parsed) => parsed,
            Err(_) => InterviewTurn {
                reply: response_text.trim().to_string(),
                is_complete: false,
                options: None,
                updated_description: None,
                regenerate_wireframe: None,
                changes_summary: None,
            },
        };

        if turn.reply.trim().is_empty() {
            turn.reply = "Could you share a bit more detail so I can continue the interview?".to_string();
        }

        if let Some(updated) = &turn.updated_description {
            if updated.trim().is_empty() {
                turn.updated_description = None;
            }
        }

        Ok(turn)
    }

    pub async fn generate_project_plan(
        &self,
        api_key: &str,
        input: &PlanInput,
    ) -> AppResult<PlanOutput> {
        let history_text = format_history(&input.interview_history);
        let user_prompt = format!(
            "Project name: {}\nProject description: {}\nInterview transcript:\n{}",
            input.project_name, input.project_description, history_text
        );

        let system_prompt = "You are IdeaForge's project architect. Respond with strict JSON only and no markdown fences. Shape:\n{\"appHighLevel\":\"# ...\",\"featureList\":\"# ...\",\"appFlow\":\"# ...\",\"suggestedStack\":\"# ...\",\"screens\":[{\"name\":\"...\",\"screenType\":\"visual\",\"description\":\"...\"}],\"cursorRules\":\"# ...\"}\nUse 4-8 screens and choose screenType as visual or info.";

        let response_text = self
            .chat_completion(TEXT_MODEL, api_key, system_prompt, &user_prompt)
            .await?;

        let parsed = parse_json::<PlanOutput>(&response_text).ok();
        let mut output = parsed.unwrap_or_else(|| build_fallback_plan(input, &response_text));

        if validate_plan(&output).is_err() {
            output = build_fallback_plan(input, &response_text);
        }

        Ok(output)
    }

    pub async fn generate_wireframe(
        &self,
        api_key: &str,
        input: &WireframeInput,
    ) -> AppResult<WireframeOutput> {
        let prompt = format!(
            "Create a clean whiteboard-style wireframe.\nApp context: {}\nScreen name: {}\nScreen description: {}\nRequirements: monochrome sketch style, labeled elements, white background, include all major controls.\n\nRespond with an image.",
            input.app_context, input.screen_name, input.description
        );

        self.image_completion(api_key, &prompt, None).await
    }

    pub async fn edit_wireframe(
        &self,
        api_key: &str,
        input: &WireframeEditInput,
    ) -> AppResult<WireframeOutput> {
        let prompt = format!(
            "Edit this wireframe for screen '{}' using this instruction: {}. Keep the same whiteboard style and return the updated wireframe image.",
            input.screen_name, input.edit_instruction
        );

        self.image_completion(api_key, &prompt, Some(&input.existing_image_base64))
            .await
    }

    async fn chat_completion(
        &self,
        model: &str,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> AppResult<String> {
        let body = json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "temperature": 0.2
        });

        let response = self.post_with_retries(api_key, body).await?;
        extract_content(&response)
    }

    async fn image_completion(
        &self,
        api_key: &str,
        prompt: &str,
        existing_image_base64: Option<&str>,
    ) -> AppResult<WireframeOutput> {
        let mut content_parts: Vec<Value> = Vec::new();

        if let Some(image_data) = existing_image_base64 {
            content_parts.push(json!({
                "type": "image_url",
                "image_url": {
                    "url": format!("data:image/png;base64,{}", image_data)
                }
            }));
        }

        content_parts.push(json!({
            "type": "text",
            "text": prompt
        }));

        let body = json!({
            "model": IMAGE_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": content_parts
                }
            ],
            "temperature": 0.25
        });

        let response = self.post_with_retries(api_key, body).await?;

        // Try to extract image from the response
        let text = extract_content(&response).unwrap_or_default();

        // OpenRouter may return image as base64 in content or as a URL
        // Check for inline base64 image in the response
        if let Some(image_data) = extract_openrouter_image(&response) {
            return Ok(WireframeOutput {
                image_base64: image_data.1,
                text,
                mime_type: image_data.0,
            });
        }

        // If no image was returned, return error
        Err(AppError::Gemini(
            "OpenRouter did not return an image in the response".to_string(),
        ))
    }

    async fn post_with_retries(&self, api_key: &str, body: Value) -> AppResult<Value> {
        let mut latest_error = None;

        for attempt in 0..MAX_RETRIES {
            let response_result = self
                .client
                .post(OPENROUTER_URL)
                .header("Authorization", format!("Bearer {}", api_key))
                .header("HTTP-Referer", "https://ideaforge.app")
                .header("X-Title", "IdeaForge")
                .json(&body)
                .send()
                .await;

            match response_result {
                Ok(response) => {
                    let status = response.status();
                    if status.is_success() {
                        return response.json::<Value>().await.map_err(AppError::from);
                    }

                    let body_text = response.text().await.unwrap_or_default();
                    let temporary = status.as_u16() == 429 || status.is_server_error();
                    latest_error = Some(AppError::Gemini(format!(
                        "OpenRouter HTTP {}: {}",
                        status, body_text
                    )));

                    if !temporary || attempt + 1 == MAX_RETRIES {
                        break;
                    }
                }
                Err(err) => {
                    latest_error = Some(AppError::Network(err));
                    if attempt + 1 == MAX_RETRIES {
                        break;
                    }
                }
            }

            tokio::time::sleep(Duration::from_millis(500 * (attempt as u64 + 1))).await;
        }

        Err(latest_error.unwrap_or_else(|| {
            AppError::Gemini("OpenRouter request failed without an explicit error".to_string())
        }))
    }
}

fn format_history(history: &[ChatTurn]) -> String {
    if history.is_empty() {
        return "(empty)".to_string();
    }

    history
        .iter()
        .map(|turn| {
            let role = match turn.role {
                ChatRole::User => "user",
                ChatRole::Model => "model",
            };
            format!("{}: {}", role, turn.content)
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn extract_content(response: &Value) -> AppResult<String> {
    let text = response
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    if text.trim().is_empty() {
        Err(AppError::Gemini(
            "OpenRouter response did not include text content".to_string(),
        ))
    } else {
        Ok(text)
    }
}

fn extract_openrouter_image(response: &Value) -> Option<(String, String)> {
    // OpenRouter image models may return multipart content
    let choices = response.get("choices")?.as_array()?;
    let message = choices.first()?.get("message")?;

    // Check if content is an array (multipart)
    if let Some(content_array) = message.get("content").and_then(Value::as_array) {
        for part in content_array {
            if let Some(image_url) = part.get("image_url").and_then(|u| u.get("url")).and_then(Value::as_str) {
                if let Some(data) = image_url.strip_prefix("data:image/png;base64,") {
                    return Some(("image/png".to_string(), data.to_string()));
                }
                if let Some(data) = image_url.strip_prefix("data:image/jpeg;base64,") {
                    return Some(("image/jpeg".to_string(), data.to_string()));
                }
            }
            // Also check inline_data format
            if let Some(inline) = part.get("inline_data") {
                let mime = inline.get("mime_type").and_then(Value::as_str).unwrap_or("image/png");
                if let Some(data) = inline.get("data").and_then(Value::as_str) {
                    return Some((mime.to_string(), data.to_string()));
                }
            }
        }
    }

    None
}

fn extract_json_payload(raw_text: &str) -> String {
    let trimmed = raw_text.trim();

    if trimmed.starts_with("```") {
        let without_opening = trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim();
        let without_closing = without_opening.trim_end_matches("```").trim();
        return without_closing.to_string();
    }

    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            return trimmed[start..=end].to_string();
        }
    }

    trimmed.to_string()
}

fn parse_json<T: DeserializeOwned>(raw_text: &str) -> AppResult<T> {
    let payload = extract_json_payload(raw_text);
    serde_json::from_str(&payload).map_err(|err| {
        AppError::Gemini(format!(
            "OpenRouter returned malformed JSON. error={}, payload={}",
            err, payload
        ))
    })
}

fn validate_plan(output: &PlanOutput) -> AppResult<()> {
    if output.app_high_level.trim().is_empty()
        || output.feature_list.trim().is_empty()
        || output.screens.is_empty()
    {
        return Err(AppError::Validation("Plan output incomplete".to_string()));
    }
    Ok(())
}

fn build_fallback_plan(input: &PlanInput, raw_response: &str) -> PlanOutput {
    let insight = raw_response
        .lines()
        .take(6)
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join(" ");

    PlanOutput {
        app_high_level: format!(
            "# App Overview\n\n## Vision\n{}\n\n## Notes\n{}",
            input.project_description,
            if insight.is_empty() { "No model context returned." } else { &insight }
        ),
        feature_list: "# Feature List\n\n## Core (MVP)\n- [ ] Primary workflow\n- [ ] State persistence\n\n## Phase 2\n- [ ] Collaboration\n- [ ] Analytics".to_string(),
        app_flow: "# App Flow\n\n1. User opens app\n2. Creates/selects project\n3. Completes primary task\n4. Reviews and iterates".to_string(),
        suggested_stack: "# Tech Stack\n\n## Frontend\nReact + TypeScript\n\n## Backend\nTauri Rust\n\n## Data\nLocal-first JSON".to_string(),
        screens: vec![
            ScreenSeed {
                name: "Home".to_string(),
                screen_type: ScreenType::Visual,
                description: "Landing screen".to_string(),
            },
            ScreenSeed {
                name: "Main Flow".to_string(),
                screen_type: ScreenType::Visual,
                description: "Core interaction screen".to_string(),
            },
        ],
        cursor_rules: format!(
            "# Project Context\n\n## Project\n{}\n\n## Description\n{}",
            input.project_name, input.project_description
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_content_from_openai_format() {
        let response = json!({
            "choices": [{
                "message": {
                    "content": "Hello world"
                }
            }]
        });
        let result = extract_content(&response).unwrap();
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn extract_content_rejects_empty() {
        let response = json!({
            "choices": [{
                "message": {
                    "content": ""
                }
            }]
        });
        assert!(extract_content(&response).is_err());
    }

    #[test]
    fn parse_json_from_fenced_block() {
        let raw = "```json\n{\"reply\":\"hi\",\"isComplete\":false,\"options\":null,\"updatedDescription\":null,\"regenerateWireframe\":null,\"changesSummary\":null}\n```";
        let turn: InterviewTurn = parse_json(raw).unwrap();
        assert_eq!(turn.reply, "hi");
    }
}
