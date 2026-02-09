use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Model,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTurn {
    pub role: ChatRole,
    pub content: String,
    pub timestamp: Option<String>,
    pub screen_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewTurn {
    pub reply: String,
    pub is_complete: bool,
    pub options: Option<Vec<String>>,
    pub updated_description: Option<String>,
    pub regenerate_wireframe: Option<bool>,
    pub changes_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanInput {
    pub project_name: String,
    pub project_description: String,
    pub interview_history: Vec<ChatTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenSeed {
    pub name: String,
    pub screen_type: ScreenType,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanOutput {
    pub app_high_level: String,
    pub feature_list: String,
    pub app_flow: String,
    pub suggested_stack: String,
    pub screens: Vec<ScreenSeed>,
    pub cursor_rules: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScreenType {
    Visual,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasRegion {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppScreen {
    pub id: String,
    pub name: String,
    pub screen_type: ScreenType,
    pub description: String,
    pub wireframe_base64: Option<String>,
    pub wireframe_url: Option<String>,
    pub canvas_region: CanvasRegion,
    pub chat_history: Vec<ChatTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Deliverables {
    pub app_high_level: Option<String>,
    pub feature_list: Option<String>,
    pub app_flow: Option<String>,
    pub suggested_stack: Option<String>,
    pub cursor_rules: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectState {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub screens: Vec<AppScreen>,
    pub deliverables: Deliverables,
    pub interview_history: Vec<ChatTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub name: String,
    pub path: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProjectInput {
    pub project: ProjectState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeInput {
    pub screen_name: String,
    pub description: String,
    pub app_context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeEditInput {
    pub existing_image_base64: String,
    pub edit_instruction: String,
    pub screen_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WireframeOutput {
    pub image_base64: String,
    pub text: String,
    pub mime_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInput {
    pub project: ProjectState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub export_root: String,
    pub files: Vec<String>,
}
