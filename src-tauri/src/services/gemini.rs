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

const TEXT_MODELS: &[&str] = &["gemini-3-flash-preview", "gemini-2.5-flash"];
const IMAGE_MODELS: &[&str] = &["gemini-3-pro-image-preview", "gemini-2.5-flash-image"];
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

        let system_prompt = "You are Screenie's planning assistant.\nIf the project context describes interview mode, ask ONE focused clarifying question at a time. Provide 2-4 clickable options for the user to choose from. Always include an \"Other\" option. Set isComplete=true only when enough detail exists to generate a plan.\nIf the project context describes screen-chat mode, suggest precise UI updates and fill updatedDescription/regenerateWireframe/changesSummary (leave options null).\nRespond with strict JSON in this exact shape:\n{\"reply\":\"...\",\"isComplete\":false,\"options\":[\"Option A\",\"Option B\",\"Other\"],\"updatedDescription\":null,\"regenerateWireframe\":null,\"changesSummary\":null}";

        let response_text = self
            .generate_text_with_fallback(TEXT_MODELS, api_key, system_prompt, &prompt)
            .await?;

        let mut turn: InterviewTurn = match parse_model_json(&response_text) {
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
        let prompt = format!(
            "Project name: {}\nProject description: {}\nInterview transcript:\n{}",
            input.project_name, input.project_description, history_text
        );

        let system_prompt = "You are Screenie's project architect. Respond with strict JSON only and no markdown fences. Shape:\n{\"appHighLevel\":\"# ...\",\"featureList\":\"# ...\",\"appFlow\":\"# ...\",\"suggestedStack\":\"# ...\",\"screens\":[{\"name\":\"...\",\"screenType\":\"visual\",\"description\":\"...\"}],\"cursorRules\":\"# ...\"}\nUse 4-8 screens and choose screenType as visual or info.";

        let response_text = self
            .generate_text_with_fallback(TEXT_MODELS, api_key, system_prompt, &prompt)
            .await?;

        let parsed = parse_model_json::<PlanOutput>(&response_text).ok();
        let mut output = parsed.unwrap_or_else(|| build_fallback_plan(input, &response_text));

        if validate_plan_output(&output).is_err() {
            output = build_fallback_plan(input, &response_text);
            validate_plan_output(&output)?;
        }

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

        self.generate_image_with_fallback(api_key, &prompt, None)
            .await
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

        self.generate_image_with_fallback(api_key, &prompt, Some(&input.existing_image_base64))
            .await
    }

    async fn generate_text_with_fallback(
        &self,
        models: &[&str],
        api_key: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> AppResult<String> {
        let mut latest_model_error: Option<AppError> = None;

        for model in models {
            match self
                .generate_text(model, api_key, system_prompt, user_prompt)
                .await
            {
                Ok(text) => return Ok(text),
                Err(err) if should_try_next_model(&err) => {
                    latest_model_error = Some(err);
                }
                Err(err) => return Err(err),
            }
        }

        Err(latest_model_error.unwrap_or_else(|| {
            AppError::Gemini("No configured Gemini text models were available".to_string())
        }))
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

    async fn generate_image_with_fallback(
        &self,
        api_key: &str,
        prompt: &str,
        existing_image_base64: Option<&str>,
    ) -> AppResult<WireframeOutput> {
        let mut latest_model_error: Option<AppError> = None;

        for model in IMAGE_MODELS {
            let body = build_image_request_body(prompt, existing_image_base64);
            let response = match self.post_with_retries(model, api_key, body).await {
                Ok(value) => value,
                Err(err) if should_try_next_model(&err) => {
                    latest_model_error = Some(err);
                    continue;
                }
                Err(err) => return Err(err),
            };

            let text = extract_text_from_response(&response).unwrap_or_default();
            let (mime_type, image_base64) = extract_image_from_response(&response)?;

            return Ok(WireframeOutput {
                image_base64,
                text,
                mime_type,
            });
        }

        Err(latest_model_error.unwrap_or_else(|| {
            AppError::Gemini("No configured Gemini image models were available".to_string())
        }))
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

fn should_try_next_model(err: &AppError) -> bool {
    let AppError::Gemini(message) = err else {
        return false;
    };

    let lowercase = message.to_ascii_lowercase();
    message.contains("HTTP 400")
        || message.contains("HTTP 403")
        || message.contains("HTTP 404")
        || lowercase.contains("not found")
        || lowercase.contains("is not supported")
        || lowercase.contains("permission")
        || lowercase.contains("access")
}

fn build_image_request_body(prompt: &str, existing_image_base64: Option<&str>) -> Value {
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

    json!({
        "contents": [{
            "role": "user",
            "parts": parts
        }],
        "generationConfig": {
            "temperature": 0.25,
            "responseModalities": ["TEXT", "IMAGE"]
        }
    })
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

fn parse_model_json<T: DeserializeOwned>(raw_text: &str) -> AppResult<T> {
    let json_payload = extract_json_payload(raw_text);
    serde_json::from_str(&json_payload).map_err(|err| {
        AppError::Gemini(format!(
            "Model returned malformed JSON. error={}, payload={}",
            err, json_payload
        ))
    })
}

fn build_fallback_plan(input: &PlanInput, raw_response: &str) -> PlanOutput {
    let insight = raw_response
        .lines()
        .take(6)
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join(" ");

    let insight_text = if insight.is_empty() {
        "No additional model context was returned.".to_string()
    } else {
        insight
    };

    PlanOutput {
        app_high_level: format!(
            "# App Overview\n\n## Vision\n{}\n\n## Target Users\nDefine the primary persona based on interview answers.\n\n## Value Proposition\nShip an MVP that validates the core workflow quickly.\n\n## Notes from Model\n{}",
            input.project_description, insight_text
        ),
        feature_list: "# Feature List\n\n## Core Features (MVP)\n- [ ] Project setup and onboarding\n- [ ] Primary task workflow\n- [ ] State persistence and settings\n\n## Phase 2 Features\n- [ ] Collaboration and sharing\n- [ ] Quality-of-life improvements\n\n## Nice-to-Haves\n- [ ] Automations and advanced analytics".to_string(),
        app_flow: "# App Flow\n\n1. User opens app and sees onboarding or project selector.\n2. User creates/selects a project and configures the core workflow.\n3. User completes the primary task loop.\n4. User reviews progress and iterates.\n\n## Screen Map\n- Home: entry point and overview\n- Core Workflow: primary task interaction\n- Details: deep dive and editing\n- Settings: preferences and account controls".to_string(),
        suggested_stack: "# Suggested Tech Stack\n\n## Frontend\n- React + TypeScript\n- State management tuned for predictable updates\n\n## Backend\n- Tauri Rust commands for secure local integrations\n\n## Data\n- Local-first JSON persistence under Documents\n\n## Rationale\nOptimized for desktop reliability, fast iteration, and low operational overhead.".to_string(),
        screens: vec![
            ScreenSeed {
                name: "Home".to_string(),
                screen_type: ScreenType::Visual,
                description: "Landing screen showing key actions and current status.".to_string(),
            },
            ScreenSeed {
                name: "Primary Flow".to_string(),
                screen_type: ScreenType::Visual,
                description: "Main interaction screen for the app's core value.".to_string(),
            },
            ScreenSeed {
                name: "Specification Notes".to_string(),
                screen_type: ScreenType::Info,
                description: "Structured notes and implementation guidance.".to_string(),
            },
        ],
        cursor_rules: format!(
            "# Project Context\n\n## Project\n{}\n\n## Description\n{}\n\n## Working Rules\n- Prioritize MVP delivery\n- Keep data local-first\n- Maintain deterministic screen flows",
            input.project_name, input.project_description
        ),
    }
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

    #[test]
    fn parse_model_json_rejects_non_json() {
        let parsed = parse_model_json::<InterviewTurn>("plain text response");
        assert!(parsed.is_err());
    }

    #[test]
    fn fallback_plan_is_valid() {
        let input = PlanInput {
            project_name: "Demo".to_string(),
            project_description: "A planning app".to_string(),
            interview_history: vec![],
        };

        let fallback = build_fallback_plan(&input, "non-json model output");
        assert!(validate_plan_output(&fallback).is_ok());
    }

    #[test]
    fn should_try_next_model_for_access_errors() {
        let err = AppError::Gemini("Gemini HTTP 404 Not Found".to_string());
        assert!(should_try_next_model(&err));
    }

    #[test]
    fn should_not_try_next_model_for_network_errors() {
        let err = AppError::Validation("local validation failure".to_string());
        assert!(!should_try_next_model(&err));
    }

    #[test]
    fn parse_interview_turn_with_options() {
        let json = r#"{"reply":"What platform?","isComplete":false,"options":["Web","Mobile","Desktop","Other"],"updatedDescription":null,"regenerateWireframe":null,"changesSummary":null}"#;
        let turn: InterviewTurn = parse_model_json(json).unwrap();
        assert_eq!(turn.reply, "What platform?");
        assert!(!turn.is_complete);
        let opts = turn.options.unwrap();
        assert_eq!(opts.len(), 4);
        assert_eq!(opts[0], "Web");
        assert_eq!(opts[3], "Other");
    }

    #[test]
    fn parse_interview_turn_without_options() {
        let json = r#"{"reply":"Tell me more","isComplete":false,"updatedDescription":null,"regenerateWireframe":null,"changesSummary":null}"#;
        let turn: InterviewTurn = parse_model_json(json).unwrap();
        assert_eq!(turn.reply, "Tell me more");
        assert!(turn.options.is_none());
    }

    #[test]
    fn parse_interview_turn_with_null_options() {
        let json = r#"{"reply":"Got it","isComplete":true,"options":null,"updatedDescription":null,"regenerateWireframe":null,"changesSummary":null}"#;
        let turn: InterviewTurn = parse_model_json(json).unwrap();
        assert!(turn.is_complete);
        assert!(turn.options.is_none());
    }

    #[test]
    fn parse_interview_turn_from_fenced_block() {
        let raw = "```json\n{\"reply\":\"Pick one\",\"isComplete\":false,\"options\":[\"A\",\"B\"],\"updatedDescription\":null,\"regenerateWireframe\":null,\"changesSummary\":null}\n```";
        let turn: InterviewTurn = parse_model_json(raw).unwrap();
        assert_eq!(turn.reply, "Pick one");
        assert_eq!(turn.options.unwrap().len(), 2);
    }
}
