package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class PredictionDto(
    @SerialName("class_name") val className: String = "",
    @SerialName("plant_name") val plantName: String = "",
    @SerialName("disease_name") val diseaseName: String = "",
    val confidence: Double = 0.0,
)

@Serializable
data class YoloPayloadDto(
    /**
     * The gate for the whole flow. False means the photo has no leaf in it, and
     * the app must stop there — running the classifier anyway would produce a
     * disease name for a photo of a hand or the sky and present it as a result.
     */
    @SerialName("is_leaf") val isLeaf: Boolean = false,
    val confidence: Double = 0.0,
    val reason: String = "",
    @SerialName("bbox_xyxy") val bbox: List<Double>? = null,
    @SerialName("crop_box_xyxy") val cropBox: List<Double>? = null,
)

@Serializable
data class CnnResultDto(
    @SerialName("class_name") val className: String = "",
    @SerialName("plant_name") val plantName: String = "",
    @SerialName("disease_name") val diseaseName: String = "",
    val confidence: Double = 0.0,
    @SerialName("top_predictions") val topPredictions: List<PredictionDto> = emptyList(),
    @SerialName("model_version") val modelVersion: String = "",
    @SerialName("model_accuracy") val modelAccuracy: Double? = null,
    @SerialName("image_size") val imageSize: Long? = null,
    @SerialName("action_plan") val actionPlan: JsonElement? = null,
    @SerialName("yolo_payload") val yolo: YoloPayloadDto = YoloPayloadDto(),
    @SerialName("client_request_id") val clientRequestId: String = "",
)

/** Request body for `/api/diagnoses/research-symptoms/`. */
@Serializable
data class ResearchRequest(
    val symptoms: String,
    @SerialName("client_request_id") val clientRequestId: String,
    /** Set once the check has been saved. */
    @SerialName("diagnosis_id") val diagnosisId: Int? = null,
    /**
     * The id of the leaf check this verification belongs to, for the normal case
     * where the grower has not decided to save anything yet. The server reads the
     * predictions from its own copy — they are never sent back up, so they cannot
     * be edited on the way.
     */
    @SerialName("cnn_request_id") val cnnRequestId: String? = null,
)

@Serializable
data class ResearchSourceDto(
    val id: Int = 0,
    val title: String = "",
    val url: String = "",
    val snippet: String = "",
    val domain: String = "",
)

@Serializable
data class ResearchResultDto(
    val skipped: Boolean = false,
    val available: Boolean = true,
    @SerialName("compatibility_question") val compatibilityQuestion: String = "",
    @SerialName("is_symptom_consistent") val isSymptomConsistent: Boolean = false,
    @SerialName("best_match") val bestMatch: String = "",
    @SerialName("compatibility_summary") val compatibilitySummary: String = "",
    @SerialName("confidence_note") val confidenceNote: String = "",
    @SerialName("compatibility_sources") val compatibilitySources: List<ResearchSourceDto> = emptyList(),
    @SerialName("treatment_question") val treatmentQuestion: String = "",
    @SerialName("treatment_summary") val treatmentSummary: String = "",
    @SerialName("treatment_safety_note") val treatmentSafetyNote: String = "",
    @SerialName("treatment_sources") val treatmentSources: List<ResearchSourceDto> = emptyList(),
    @SerialName("final_conclusion") val finalConclusion: String = "",
    @SerialName("user_next_step") val userNextStep: String = "",
    @SerialName("generated_at") val generatedAt: String = "",
    @SerialName("diagnosis_id") val diagnosisId: Int? = null,
)

@Serializable
data class DiagnosisDto(
    val id: Int,
    val title: String = "",
    @SerialName("image_url") val imageUrl: String = "",
    @SerialName("thumbnail_url") val thumbnailUrl: String = "",
    @SerialName("input_method") val inputMethod: String = "upload",
    val status: String = "pending",
    @SerialName("is_leaf") val isLeaf: Boolean = false,
    @SerialName("yolo_confidence") val yoloConfidence: Double = 0.0,
    @SerialName("cnn_confidence") val cnnConfidence: Double = 0.0,
    @SerialName("cnn_payload") val cnnPayload: JsonElement? = null,
    @SerialName("plant_name") val plantName: String = "",
    @SerialName("disease_name") val diseaseName: String = "",
    val severity: String = "",
    @SerialName("symptom_input") val symptomInput: String = "",
    val note: String = "",
    @SerialName("action_plan") val actionPlan: JsonElement? = null,
    @SerialName("rag_summary") val ragSummary: String = "",
    @SerialName("rag_payload") val ragPayload: JsonElement? = null,
    @SerialName("model_version") val modelVersion: String = "",
    /** True when the plan's retention window has scrolled past this record. */
    @SerialName("beyond_retention") val beyondRetention: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
)

/**
 * The history page. Note this is *not* DRF's default pagination shape — the
 * diagnoses list route hand-rolls limit/offset, so `next_offset` is what drives
 * the next page rather than a `next` URL.
 */
@Serializable
data class DiagnosisPageDto(
    val count: Int = 0,
    val limit: Int = 20,
    val offset: Int = 0,
    @SerialName("next_offset") val nextOffset: Int? = null,
    val results: List<DiagnosisDto> = emptyList(),
)

@Serializable
data class UsageBlockDto(
    val limit: Int? = null,
    val used: Int = 0,
    val remaining: Int? = null,
)

@Serializable
data class HistoryWindowDto(
    @SerialName("retention_days") val retentionDays: Int? = null,
    val total: Int = 0,
    val visible: Int = 0,
    val hidden: Int = 0,
    /** Server-authored wording. Never re-phrased in the app. */
    val notice: String = "",
)

@Serializable
data class UsageDto(
    val plan: String = "seed",
    @SerialName("plan_name") val planName: String = "",
    @SerialName("upgrade_to") val upgradeTo: String = "",
    @SerialName("upgrade_to_name") val upgradeToName: String = "",
    @SerialName("daily_diagnoses") val dailyDiagnoses: UsageBlockDto = UsageBlockDto(),
    @SerialName("monthly_diagnoses") val monthlyDiagnoses: UsageBlockDto = UsageBlockDto(),
    val history: HistoryWindowDto = HistoryWindowDto(),
)
