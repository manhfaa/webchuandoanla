package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire shapes for the farm-operations routes, taken from
 * `backend/farmops/models.py` and its serializers rather than inferred.
 */

@Serializable
data class FarmLocationDto(
    val id: Int = 0,
    val name: String = "",
    val province: String = "",
    val district: String = "",
    val ward: String = "",
    @SerialName("address_text") val addressText: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerialName("crop_type") val cropType: String = "",
    @SerialName("is_default") val isDefault: Boolean = false,
)

@Serializable
data class FarmPlotDto(
    val id: Int = 0,
    val location: Int? = null,
    val name: String = "",
    @SerialName("crop_type") val cropType: String = "",
    /**
     * A decimal on the server, so it arrives as a string.
     *
     * Parsed rather than declared as Double: `"1200.00"` through a JSON number
     * would round-trip through a binary float, and a grower who typed 0.35 ha
     * should see 0.35 ha back.
     */
    @SerialName("area_value") val areaValue: String? = null,
    @SerialName("area_unit") val areaUnit: String = "m2",
    @SerialName("address_text") val addressText: String = "",
    @SerialName("planting_start_date") val plantingStartDate: String? = null,
    @SerialName("growth_stage") val growthStage: String = "",
    val note: String = "",
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class FarmPlotWriteDto(
    val name: String,
    @SerialName("crop_type") val cropType: String,
    val location: Int? = null,
    @SerialName("area_value") val areaValue: String? = null,
    @SerialName("area_unit") val areaUnit: String = "m2",
    @SerialName("address_text") val addressText: String = "",
    @SerialName("growth_stage") val growthStage: String = "",
    val note: String = "",
)

@Serializable
data class CultivationLogDto(
    val id: Int = 0,
    val plot: Int = 0,
    val diagnosis: Int? = null,
    @SerialName("activity_type") val activityType: String = "note",
    @SerialName("activity_date") val activityDate: String = "",
    val title: String = "",
    val description: String = "",
    @SerialName("image_url") val imageUrl: String = "",
    @SerialName("cost_amount") val costAmount: String? = null,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class CultivationLogWriteDto(
    val plot: Int,
    @SerialName("activity_type") val activityType: String,
    @SerialName("activity_date") val activityDate: String,
    val title: String,
    val description: String = "",
    @SerialName("cost_amount") val costAmount: String? = null,
)

@Serializable
data class TraceabilityDto(
    val id: Int = 0,
    val plot: Int = 0,
    @SerialName("plot_name") val plotName: String = "",
    @SerialName("crop_type") val cropType: String = "",
    @SerialName("public_token") val publicToken: String = "",
    @SerialName("product_name") val productName: String = "",
    /**
     * Which parts of the plot the public page shows.
     *
     * Kept as booleans the app can toggle directly: precise coordinates and
     * input costs are off by default, and turning either on is a decision the
     * grower makes rather than something the record does for them.
     */
    @SerialName("public_settings") val publicSettings: Map<String, Boolean> = emptyMap(),
    @SerialName("is_public") val isPublic: Boolean = true,
    @SerialName("public_url") val publicUrl: String = "",
    @SerialName("qr_image_url") val qrImageUrl: String = "",
)

/* ------------------------------------------------------------- weather --- */

@Serializable
data class WeatherRowDto(
    val date: String = "",
    @SerialName("observed_at") val observedAt: String? = null,
    /**
     * False when Open-Meteo omitted the live block and the server fell back to
     * today's aggregate.
     *
     * The daily row's wind is the day's *maximum* and its temperature the
     * midpoint of max/min, so presenting it as "right now" would be wrong. The
     * screen says "số liệu trong ngày" instead when this is false.
     */
    @SerialName("is_current") val isCurrent: Boolean = false,
    @SerialName("temperature_c") val temperatureC: Int = 0,
    @SerialName("temperature_max_c") val temperatureMaxC: Int? = null,
    @SerialName("temperature_min_c") val temperatureMinC: Int? = null,
    @SerialName("humidity_percent") val humidityPercent: Int = 0,
    @SerialName("rain_probability_percent") val rainProbabilityPercent: Int = 0,
    @SerialName("wind_kmh") val windKmh: Int = 0,
    @SerialName("precipitation_mm") val precipitationMm: Double = 0.0,
    val summary: String = "",
)

@Serializable
data class WeatherDto(
    val source: String = "",
    /** When the server asked the provider — not when the reading was taken. */
    @SerialName("fetched_at") val fetchedAt: String = "",
    @SerialName("observed_at") val observedAt: String? = null,
    val timezone: String = "",
    val current: WeatherRowDto = WeatherRowDto(),
    val today: WeatherRowDto = WeatherRowDto(),
    @SerialName("forecast_7d") val forecast7d: List<WeatherRowDto> = emptyList(),
)

@Serializable
data class PestAlertDto(
    val id: String = "",
    val title: String = "",
    val severity: String = "normal",
    val description: String = "",
    val recommendation: String = "",
)

@Serializable
data class FarmAdvisoryDto(
    val source: String = "",
    @SerialName("fetched_at") val fetchedAt: String = "",
    val warnings: List<String> = emptyList(),
    @SerialName("pest_alerts") val pestAlerts: List<PestAlertDto> = emptyList(),
    val recommendations: List<String> = emptyList(),
    val disclaimer: String = "",
)

/* ------------------------------------------------------------- library --- */

@Serializable
data class AgriculturalInputDto(
    val id: Int = 0,
    val category: String = "",
    val name: String = "",
    val group: String = "",
    @SerialName("active_ingredient") val activeIngredient: String = "",
    val usage: String = "",
    @SerialName("suitable_crops") val suitableCrops: List<String> = emptyList(),
    @SerialName("related_diseases") val relatedDiseases: List<String> = emptyList(),
    @SerialName("safety_notes") val safetyNotes: List<String> = emptyList(),
    @SerialName("withholding_period_days") val withholdingPeriodDays: Int? = null,
    /** Non-empty means this input needs care. The card must say so, in words. */
    val warning: String = "",
)
