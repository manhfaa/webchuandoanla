package vn.agromind.app.core.model

import vn.agromind.app.core.designsystem.components.ConfidenceBand

/**
 * Domain types for a leaf check.
 *
 * Separate from the DTOs on purpose. The wire format carries things a screen has
 * no business reasoning about — `class_name` like `Tomato___Late_blight`, a
 * confidence as a 0..1 double, a nullable action plan as raw JSON. Converting
 * once, at the repository boundary, is what stops every screen from re-deriving
 * "88%" and re-deciding what counts as "cần theo dõi".
 */

data class Prediction(
    val plantName: String,
    val diseaseName: String,
    /** 0..1 as the model reports it. */
    val confidence: Double,
) {
    val percent: Int get() = (confidence * 100).toInt().coerceIn(0, 100)

    /** "Sầu riêng · Thán thư lá" — the one label the result screen shows. */
    val label: String
        get() = listOf(plantName, diseaseName).filter { it.isNotBlank() }.joinToString(" · ")
}

/**
 * What the leaf detector said about the photo.
 *
 * [isLeaf] is a gate, not a hint. When it is false the classifier must not run
 * and no disease name may be shown: a photo of a hand would otherwise come back
 * with a confident-looking crop disease attached to it.
 */
data class LeafDetection(
    val isLeaf: Boolean,
    val confidence: Double,
    val reason: String,
    /** Normalised 0..1 boxes, ready to draw over the photo at any size. */
    val regions: List<LeafRegion>,
)

data class LeafRegion(val left: Float, val top: Float, val right: Float, val bottom: Float)

/**
 * The classifier's answer.
 *
 * [top] is empty when the photo passed the leaf check but produced nothing
 * usable. That is a real outcome with its own screen — "Ảnh lá hợp lệ, chưa có
 * kết quả phân loại" — and must never be flattened into a 0% result.
 */
data class Classification(
    val best: Prediction?,
    val top: List<Prediction>,
    val modelVersion: String,
    /** Server-side id for this run; what a research request refers back to. */
    val requestId: String,
) {
    val hasResult: Boolean get() = best != null

    val band: ConfidenceBand
        get() = when {
            best == null -> ConfidenceBand.Recheck
            best.percent >= 80 -> ConfidenceBand.High
            best.percent >= 55 -> ConfidenceBand.Watch
            else -> ConfidenceBand.Recheck
        }
}

data class Source(
    val id: Int,
    val title: String,
    val url: String,
    val snippet: String,
    val domain: String,
)

/** The verification run, when the grower described symptoms. */
data class SymptomResearch(
    val isConsistent: Boolean,
    val bestMatch: String,
    val compatibilitySummary: String,
    val confidenceNote: String,
    val compatibilitySources: List<Source>,
    val treatmentSummary: String,
    val safetyNote: String,
    val treatmentSources: List<Source>,
    val finalConclusion: String,
    val nextStep: String,
)

/** When a recommended action should happen. Ordered by urgency, not by severity. */
enum class ActionTiming { Today, InTwoOrThreeDays, WhenWorse }

data class RecommendedAction(
    val timing: ActionTiming,
    val title: String,
    val body: String,
)

/** How the photo got into the app. Reported to the server for its own stats. */
enum class InputMethod(val wire: String) {
    Capture("capture"),
    Upload("upload"),
}
