use std::time::Duration;

use serde::de::DeserializeOwned;
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    models::{ChatRole, ChatTurn, InterviewTurn, PlanInput, PlanOutput, WireframeEditInput, WireframeInput, WireframeOutput},
};

const TEXT_MODEL: &str = "gemini-2.5-flash";
const IMAGE_MODEL: &str = "gemini-2.5-flash-image";
const MAX_RETRIES: usize = 3;

pub struct GeminiService {
    client: reqwest::Client,
}

impl GeminiService {
    pub fn new() -> AppResult<Self> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(35))
            .build()?;
        Ok(Self { client })
    }

    pub async fn run_interview_turn(
        &self,
        api_key: &str,
        project_context: &str,
        history: &[ChatTurn],
    ) -> AppResult<InterviewTurn> {
        let history_text = format_history(history);
        let prompt = format!(
            "Project context:\n{}\n\nConversation so far:\n{}\n\nReturn one JSON object only.",
            project_context, history_text
        );

        let system_prompt = "You are IdeaForge's planning assistant.\nIf the project context describes interview mode, ask practical clarifying questions and set isComplete=true only when enough detail exists to generate a plan.\nIf the project context describes screen-chat mode, suggest precise UI updates and fill updatedDescription/regenerateWireframe/changesSummary.\nRespond with strict JSON in this exact shape:\n{\"reply\":\"...\",\"isComplete\":false,\"updatedDescription\":null,\"regenerateWireframe\":null,\"changesSummary\":null}";

        let mut turn: InterviewTurn = self
            .generate_json(TEXT_MODEL, api_key, system_prompt, &prompt)
            .await?;

        if turn.reply.trim().is_empty() {
            return Err(AppError::Gemini(
                "Interview response was empty after JSON parsing".to_string(),
            ));
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
        let prompt = format!(
            "Project name: {}\nProject description: {}\nInterview transcript:\n{}",
            input.project_name, input.project_description, history_text
        );

        let system_prompt = "You are IdeaForge's project architect. Respond with strict JSON only and no markdown fences. Shape:\n{\"appHighLevel\":\"# ...\",\"featureList\":\"# ...\",\"appFlow\":\"# ...\",\"suggestedStack\":\"# ...\",\"screens\":[{\"name\":\"...\",\"screenType\":\"visual\",\"description\":\"...\"}],\"cursorRules\":\"# ...\"}\nUse 4-8 screens and choose screenType as visual or info.";

        let output: PlanOutput = self
            .generate_json(TEXT_MODEL, api_key, system_prompt, &prompt)
            .await?;

        validate_plan_output(&output)?;
        Ok(output)
    }

    pub async fn generate_wireframe(
        &self,
        api_key: &str,
        input: &WireframeInput,
    ) -> AppResult<WireframeOutput> {
        let prompt = format!(
            "Create a clean whiteboard-style wireframe.\\nApp context: {}\\nScreen name: {}\\nScreen description: {}\\nRequirements: monochrome sketch style, labeled elements, white background, include all major controls.",
            input.app_context, input.screen_name, input.description
        );

        self.generate_image(api_key, &prompt, None).await
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

        self.generate_image(api_key, &prompt, Some(input.existing_image_base64.clone()))
            .await
    }

    async fn generate_json<T: DeserializeOwned>(
        &self,
        model: &str,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> AppResult<T> {
        let text = self
            .generate_text(model, api_key, system_prompt, user_prompt)
            .await?;

        let json_payload = extract_json_payload(&text);
        serde_json::from_str(&json_payload).map_err(|err| {
            AppError::Gemini(format!(
                "Model returned malformed JSON. error={}, payload={}",
                err, json_payload
            ))
        })
    }

    async fn generate_text(
        &self,
        model: &str,
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> AppResult<String> {
        let body = json!({
            "systemInstruction": {
                "parts": [{ "text": system_prompt }]
            },
            "contents": [{
                "role": "user",
                "parts": [{ "text": user_prompt }]
            }],
            "generationConfig": {
                "temperature": 0.2
            }
        });

        let response = self.post_with_retries(model, api_key, body).await?;
        extract_text_from_response(&response)
    }

    async fn generate_image(
        &self,
        api_key: &str,
        prompt: &str,
        existing_image_base64: Option<String>,
    ) -> AppResult<WireframeOutput> {
        let mut parts = vec![json!({ "text": prompt })];

        if let Some(image_data) = existing_image_base64 {
            parts.insert(
                0,
                json!({
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": image_data
                    }
                }),
            );
        }

        let body = json!({
            "contents": [{
                "role": "user",
                "parts": parts
            }],
            "generationConfig": {
                "temperature": 0.25,
                "responseModalities": ["TEXT", "IMAGE"]
            }
        });

        let response = self
            .post_with_retries(IMAGE_MODEL, api_key, body)
            .await?;

        let text = extract_text_from_response(&response).unwrap_or_default();
        let (mime_type, image_base64) = extract_image_from_response(&response)?;

        Ok(WireframeOutput {
            image_base64,
            text,
            mime_type,
        })
    }

    async fn post_with_retries(&self, model: &str, api_key: &str, body: Value) -> AppResult<Value> {
        let endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );

        let mut latest_error = None;

        for attempt in 0..MAX_RETRIES {
            let response_result = self.client.post(&endpoint).json(&body).send().await;

            match response_result {
                Ok(response) => {
                    let status = response.status();
                    if status.is_success() {
                        return response.json::<Value>().await.map_err(AppError::from);
                    }

                    let body_text = response.text().await.unwrap_or_default();
                    let temporary = status.as_u16() == 429 || status.is_server_error();
                    latest_error = Some(AppError::Gemini(format!(
                        "Gemini HTTP {}: {}",
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

            tokio::time::sleep(Duration::from_millis(250 * (attempt as u64 + 1))).await;
        }

        Err(latest_error.unwrap_or_else(|| {
            AppError::Gemini("Gemini request failed without an explicit error".to_string())
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

fn extract_text_from_response(response: &Value) -> AppResult<String> {
    let parts = response
        .get("candidates")
        .and_then(Value::as_array)
        .and_then(|candidates| candidates.first())
        .and_then(|candidate| candidate.get("content"))
        .and_then(|content| content.get("parts"))
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Gemini("Response missing candidates/content/parts".to_string()))?;

    let text = parts
        .iter()
        .filter_map(|part| part.get("text").and_then(Value::as_str))
        .collect::<Vec<&str>>()
        .join("\n");

    if text.trim().is_empty() {
        Err(AppError::Gemini(
            "Response did not include textual content".to_string(),
        ))
    } else {
        Ok(text)
    }
}

fn extract_image_from_response(response: &Value) -> AppResult<(String, String)> {
    let parts = response
        .get("candidates")
        .and_then(Value::as_array)
        .and_then(|candidates| candidates.first())
        .and_then(|candidate| candidate.get("content"))
        .and_then(|content| content.get("parts"))
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Gemini("Response missing candidates/content/parts".to_string()))?;

    for part in parts {
        let Some(inline_data) = part.get("inlineData") else {
            continue;
        };

        let mime_type = inline_data
            .get("mimeType")
            .and_then(Value::as_str)
            .unwrap_or("image/png")
            .to_string();

        let data = inline_data
            .get("data")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::Gemini("Image response missing inlineData.data".to_string()))?
            .to_string();

        if !data.trim().is_empty() {
            return Ok((mime_type, data));
        }
    }

    Err(AppError::Gemini(
        "Image response did not include inline image data".to_string(),
    ))
}

fn extract_json_payload(raw_text: &str) -> String {
    let trimmed = raw_text.trim();

    if trimmed.starts_with("```") {
        let without_opening = trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim();
        let without_closing = without_opening
            .trim_end_matches("```")
            .trim();
        return without_closing.to_string();
    }

    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            return trimmed[start..=end].to_string();
        }
    }

    trimmed.to_string()
}

fn validate_plan_output(output: &PlanOutput) -> AppResult<()> {
    if output.app_high_level.trim().is_empty()
        || output.feature_list.trim().is_empty()
        || output.app_flow.trim().is_empty()
        || output.suggested_stack.trim().is_empty()
        || output.cursor_rules.trim().is_empty()
    {
        return Err(AppError::Validation(
            "Plan output contained empty deliverable fields".to_string(),
        ));
    }

    if output.screens.is_empty() {
        return Err(AppError::Validation(
            "Plan output must include at least one screen".to_string(),
        ));
    }

    if output.screens.len() > 20 {
        return Err(AppError::Validation(
            "Plan output included too many screens for MVP constraints".to_string(),
        ));
    }

    if output
        .screens
        .iter()
        .any(|screen| screen.name.trim().is_empty() || screen.description.trim().is_empty())
    {
        return Err(AppError::Validation(
            "Plan output included a screen with empty name/description".to_string(),
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ScreenSeed, ScreenType};

    #[test]
    fn json_payload_extracts_fenced_block() {
        let payload = extract_json_payload("```json\n{\"a\":1}\n```");
        assert_eq!(payload, "{\"a\":1}");
    }

    #[test]
    fn validate_plan_output_rejects_empty_screens() {
        let invalid = PlanOutput {
            app_high_level: "a".to_string(),
            feature_list: "b".to_string(),
            app_flow: "c".to_string(),
            suggested_stack: "d".to_string(),
            screens: vec![],
            cursor_rules: "e".to_string(),
        };

        assert!(validate_plan_output(&invalid).is_err());
    }

    #[test]
    fn validate_plan_output_accepts_valid_payload() {
        let valid = PlanOutput {
            app_high_level: "a".to_string(),
            feature_list: "b".to_string(),
            app_flow: "c".to_string(),
            suggested_stack: "d".to_string(),
            screens: vec![ScreenSeed {
                name: "Home".to_string(),
                screen_type: ScreenType::Visual,
                description: "Landing".to_string(),
            }],
            cursor_rules: "e".to_string(),
        };

        assert!(validate_plan_output(&valid).is_ok());
    }
}
