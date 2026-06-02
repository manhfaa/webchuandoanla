export type PlanTier = "seed" | "grow" | "bloom" | "elite";

export type PlantType = string;

export type DiagnosisStepKey = "yolo" | "roadmap" | "rag";

export type DiagnosisStepState =
  | "idle"
  | "queued"
  | "processing"
  | "success"
  | "warning"
  | "locked";

export type DiagnosisStatus =
  | "idle"
  | "uploading"
  | "scanning"
  | "success"
  | "invalid-image"
  | "locked";

export type CameraPreviewState = "idle" | "starting" | "live" | "error" | "unsupported";

export type SeverityLevel = "Nhẹ" | "Trung bình" | "Cao" | string;
export type DiagnosisInputMethod = "upload" | "capture" | "sample";
export type DiagnosisRecordOrigin = "user";

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  accent: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
}

export interface SupportedPlant {
  id: string;
  name: PlantType;
  latinLabel: string;
  insight: string;
  accent: string;
}

export interface WorkflowStep {
  id: string;
  step: string;
  title: string;
  description: string;
}

export interface PricingPlan {
  id: PlanTier;
  name: string;
  icon: string;
  price: string;
  description: string;
  cta: string;
  highlight?: boolean;
  badge?: string;
  features: string[];
}

export interface RecommendationBlock {
  title: string;
  items: string[];
}

export interface ActionPlan {
  risk_level: "unknown" | "low" | "medium" | "high" | string;
  immediate_actions: string[];
  follow_up_actions: string[];
  expert_required: boolean;
  recheck_after_days: number;
  should_retake_photo?: boolean;
  safety_notes: string[];
  disclaimer: string;
  warning?: string;
  severity?: string;
}

export interface DiagnosisRecord {
  id: string;
  plant: PlantType;
  disease: string;
  confidence: number;
  severity: SeverityLevel;
  classificationReady?: boolean;
  image: string;
  createdAt: string;
  note: string;
  yoloVerified: boolean;
  leafConfidence?: number;
  leafCheckNote?: string;
  inputMethod?: DiagnosisInputMethod;
  origin?: DiagnosisRecordOrigin;
  symptomSummary: string;
  causes: string[];
  recommendations: RecommendationBlock[];
  actionPlan?: ActionPlan;
  cnnConfidence?: number;
  cnnPayload?: Record<string, unknown>;
  modelVersion?: string;
  savedByUser?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  currentPlan: PlanTier;
}

export type ChatWorkspace = "assistant" | "expert";
export type ChatMode = "assistant" | "expert";

export interface ChatApiRequest {
  query: string;
  mode: ChatMode;
  latestDiagnosis?: DiagnosisRecord | null;
}

export interface ChatApiResponse {
  mode: ChatMode;
  answer: string;
  generatedAt: string;
}

export type CropPlanStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "needs_review"
  | "archived";

export type CropPlanStepStatus =
  | "pending"
  | "current"
  | "completed"
  | "skipped"
  | "delayed";

export interface CropCatalogItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  default_planting_modes: string[];
  is_beginner_friendly: boolean;
}

export interface CropLocation {
  id: number;
  name: string;
  lat: number;
  lon: number;
  address_text: string;
  timezone: string;
  is_default: boolean;
  admin_area_1?: string;
  admin_area_2?: string;
}

export interface WeatherSnapshot {
  id: number;
  source: string;
  time_range_start: string;
  time_range_end: string;
  daily_series: Array<Record<string, number | string>>;
  derived_metrics: Record<string, number | string>;
  fetched_at: string;
}

export interface CropPlanStep {
  id: number;
  phase_key: string;
  step_number: number;
  title: string;
  short_label: string;
  description: string;
  why_this_step_matters: string;
  prerequisites: string[];
  tools_needed: string[];
  estimated_duration_minutes: number;
  suggested_start_time: string;
  suggested_end_time: string;
  repeat_rule: Record<string, unknown> | null;
  reminder_times: string[];
  completion_condition: string;
  risk_notes: string[];
  weather_dependency: Record<string, unknown>;
  water_amount:
    | {
        value: number;
        unit: string;
      }
    | null;
  fertilizer_amount:
    | {
        value: number;
        unit: string;
      }
    | null;
  sunlight_requirement_text: string;
  dependency_step_ids: number[];
  status: CropPlanStepStatus;
  delay_reason: string;
  sort_key: string;
  user_notes: string;
  completed_at: string | null;
}

export interface ReminderItem {
  id: number;
  crop_plan: number;
  step: number | null;
  step_title: string;
  title: string;
  body: string;
  deep_link: string;
  trigger_time: string;
  fallback_trigger_time: string | null;
  priority: string;
  type: string;
  channel: string;
  status: string;
  read: boolean;
  completed_or_not: boolean;
  payload: Record<string, unknown>;
}

export interface CropPlan {
  id: number;
  crop: CropCatalogItem;
  location: CropLocation;
  weather_snapshot: WeatherSnapshot | null;
  title: string;
  planting_mode: string;
  area_value: string | number | null;
  area_unit: string;
  plant_count: number;
  planned_start_date: string;
  recommended_start_date: string | null;
  status: CropPlanStatus;
  suitability_score: number;
  suitability_level: string;
  summary: string;
  ai_reasoning_summary: string;
  plan_goal: string;
  experience_level: string;
  plan_version: number;
  metadata: Record<string, any>;
  steps: CropPlanStep[];
  reminders: ReminderItem[];
  created_at: string;
  updated_at: string;
}

export interface CropPlanPreview {
  crop: CropCatalogItem;
  location: {
    name: string;
    lat: number;
    lon: number;
    address_text: string;
    timezone: string;
  };
  summary: {
    planned_start_date: string;
    recommended_start_date: string;
    suitability_score: number;
    suitability_level: string;
    key_warnings: string[];
    reasoning_summary: string;
    climate_metrics: Record<string, number | string>;
  };
  steps: Array<Record<string, any>>;
}

export interface CreateCropPlanPayload {
  crop_type: string;
  location_id?: number;
  location_name?: string;
  lat?: number;
  lon?: number;
  address_text?: string;
  planting_mode: "pot" | "ground";
  area_value?: number | null;
  area_unit?: string;
  plant_count: number;
  start_date: string;
  experience_level: "beginner" | "intermediate";
  plan_goal: "home" | "trial" | "small_farm" | "commercial";
  timezone?: string;
}
