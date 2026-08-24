package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire shapes for `/api/crop-plans/`.
 *
 * The server carries a Vietnamese and an English copy of most text
 * (`title` / `title_en`). Only the Vietnamese fields are declared here: the app
 * ships Vietnamese, and pulling both would double the payload for strings that
 * are never rendered. Adding an English locale means adding the `_en` fields
 * then, not carrying them now.
 */

/** DRF's standard page. The diagnoses list is the odd one out, not this. */
@Serializable
data class PageDto<T>(
    val count: Int = 0,
    val next: String? = null,
    val previous: String? = null,
    val results: List<T> = emptyList(),
)

@Serializable
data class CropDto(
    val id: Int = 0,
    val slug: String = "",
    val name: String = "",
    val category: String = "",
    val description: String = "",
    @SerialName("is_beginner_friendly") val isBeginnerFriendly: Boolean = true,
)

@Serializable
data class CropLocationDto(
    val id: Int = 0,
    val name: String = "",
    val lat: Double = 0.0,
    val lon: Double = 0.0,
    @SerialName("address_text") val addressText: String = "",
    val timezone: String = "Asia/Ho_Chi_Minh",
    @SerialName("is_default") val isDefault: Boolean = false,
)

@Serializable
data class CropPlanStepSummaryDto(
    val id: Int = 0,
    @SerialName("step_number") val stepNumber: Int = 0,
    val title: String = "",
    @SerialName("short_label") val shortLabel: String = "",
    val status: String = "pending",
)

@Serializable
data class CropPlanStepDto(
    val id: Int = 0,
    @SerialName("phase_key") val phaseKey: String = "",
    @SerialName("step_number") val stepNumber: Int = 0,
    val title: String = "",
    @SerialName("short_label") val shortLabel: String = "",
    val description: String = "",
    @SerialName("why_this_step_matters") val whyItMatters: String = "",
    @SerialName("estimated_duration_minutes") val estimatedMinutes: Int = 0,
    @SerialName("suggested_start_time") val suggestedStartTime: String = "",
    @SerialName("suggested_end_time") val suggestedEndTime: String = "",
    @SerialName("risk_notes") val riskNotes: List<String> = emptyList(),
    @SerialName("tools_needed") val toolsNeeded: List<String> = emptyList(),
    val status: String = "pending",
    @SerialName("delay_reason") val delayReason: String = "",
    @SerialName("user_notes") val userNotes: String = "",
    @SerialName("completed_at") val completedAt: String? = null,
)

@Serializable
data class CropPlanListItemDto(
    val id: Int = 0,
    val crop: CropDto = CropDto(),
    val location: CropLocationDto? = null,
    val title: String = "",
    @SerialName("planting_mode") val plantingMode: String = "pot",
    @SerialName("plant_count") val plantCount: Int = 1,
    @SerialName("planned_start_date") val plannedStartDate: String = "",
    @SerialName("recommended_start_date") val recommendedStartDate: String? = null,
    val status: String = "",
    @SerialName("suitability_score") val suitabilityScore: Int? = null,
    @SerialName("suitability_level") val suitabilityLevel: String = "",
    val summary: String = "",
    @SerialName("current_step") val currentStep: CropPlanStepSummaryDto? = null,
    @SerialName("step_count") val stepCount: Int = 0,
    @SerialName("completed_step_count") val completedStepCount: Int = 0,
    @SerialName("reminder_count") val reminderCount: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class CropPlanDetailDto(
    val id: Int = 0,
    val crop: CropDto = CropDto(),
    val location: CropLocationDto? = null,
    val title: String = "",
    val status: String = "",
    val summary: String = "",
    @SerialName("ai_reasoning_summary") val reasoningSummary: String = "",
    @SerialName("suitability_score") val suitabilityScore: Int? = null,
    @SerialName("suitability_level") val suitabilityLevel: String = "",
    @SerialName("planned_start_date") val plannedStartDate: String = "",
    @SerialName("plan_version") val planVersion: Int = 1,
    val steps: List<CropPlanStepDto> = emptyList(),
)

/**
 * Request body for both preview and create.
 *
 * The preview route runs the same planner and returns the same shape, but saves
 * nothing and — importantly — spends no quota. The wizard's fourth screen is a
 * preview for exactly that reason: a grower should be able to see what they are
 * about to get before it costs them one of their two plans for the month.
 */
@Serializable
data class CropPlanCreateRequest(
    @SerialName("crop_type") val cropType: String,
    @SerialName("start_date") val startDate: String,
    @SerialName("planting_mode") val plantingMode: String = "pot",
    @SerialName("plant_count") val plantCount: Int = 1,
    @SerialName("location_id") val locationId: Int? = null,
    @SerialName("location_name") val locationName: String? = null,
    val lat: Double? = null,
    val lon: Double? = null,
    @SerialName("address_text") val addressText: String? = null,
    @SerialName("area_value") val areaValue: String? = null,
    @SerialName("area_unit") val areaUnit: String = "m2",
    @SerialName("experience_level") val experienceLevel: String = "beginner",
    @SerialName("plan_goal") val planGoal: String = "home",
    val timezone: String = "Asia/Ho_Chi_Minh",
)

@Serializable
data class StepNoteRequest(val note: String = "")

@Serializable
data class StepDelayRequest(
    @SerialName("delay_days") val delayDays: Int,
    val reason: String = "",
)

@Serializable
data class ReminderDto(
    val id: Int = 0,
    @SerialName("crop_plan") val cropPlan: Int? = null,
    val step: Int? = null,
    @SerialName("step_title") val stepTitle: String? = null,
    val title: String = "",
    val body: String = "",
    @SerialName("deep_link") val deepLink: String = "",
    @SerialName("trigger_time") val triggerTime: String = "",
    val priority: String = "medium",
    val type: String = "step_due",
    val status: String = "scheduled",
    val read: Boolean = false,
)

@Serializable
data class ReminderReadRequest(val read: Boolean = true)
