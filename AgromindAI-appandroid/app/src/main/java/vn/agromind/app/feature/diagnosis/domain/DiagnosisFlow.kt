package vn.agromind.app.feature.diagnosis.domain

import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.model.Classification
import vn.agromind.app.core.model.LeafDetection
import vn.agromind.app.core.model.SymptomResearch

/**
 * The leaf check, as a state machine.
 *
 * Written as a closed set rather than a handful of booleans because the flow has
 * rules that must hold no matter how the screen was reached — including after
 * the process was killed and restored:
 *
 * * [LeafRejected] is terminal for that photo. There is no transition from it to
 *   [Classifying]; a photo with no leaf in it never reaches the classifier.
 * * [AwaitingSymptoms] can go to *either* [Researching] or straight to
 *   [Finalizing]. Skipping the description is a supported choice, not a
 *   degraded path, and it must not trigger a verification run.
 * * [FailedRetryable] keeps everything the grower supplied. A 503 in the middle
 *   of a research run must never cost them the photo they walked into the garden
 *   to take, or the three sentences they typed with one thumb.
 *
 * Boolean flags would have allowed "rejected and classifying", "researching
 * without symptoms" and "failed but also saved" to exist. This cannot.
 */
sealed interface DiagnosisState {

    /** Nothing chosen yet. */
    data object Draft : DiagnosisState

    /** A photo is ready locally; nothing sent. */
    data class PhotoReady(val photo: LocalPhoto) : DiagnosisState

    /** Uploading and running the leaf check + classifier in one call. */
    data class Analyzing(val photo: LocalPhoto) : DiagnosisState

    /** No leaf found. Terminal for this photo — the classifier is not run. */
    data class LeafRejected(
        val photo: LocalPhoto,
        val detection: LeafDetection,
    ) : DiagnosisState

    /** Leaf found, classifier finished. Waiting for the grower to describe symptoms. */
    data class AwaitingSymptoms(
        val photo: LocalPhoto,
        val detection: LeafDetection,
        val classification: Classification,
        val symptoms: String = "",
    ) : DiagnosisState

    /** Symptoms given; the seven-stage verification is running. */
    data class Researching(
        val photo: LocalPhoto,
        val detection: LeafDetection,
        val classification: Classification,
        val symptoms: String,
    ) : DiagnosisState

    /** Everything gathered; saving the record. */
    data class Finalizing(
        val photo: LocalPhoto,
        val detection: LeafDetection,
        val classification: Classification,
        val symptoms: String,
        val research: SymptomResearch?,
    ) : DiagnosisState

    /** Saved. [diagnosisId] is the server's, never invented locally. */
    data class Saved(
        val diagnosisId: Int,
        val classification: Classification,
        val research: SymptomResearch?,
    ) : DiagnosisState

    /**
     * Something failed and trying again is reasonable.
     *
     * [resumeFrom] is the state to return to, so a retry picks up where it broke
     * instead of restarting the whole check — which would spend a second
     * inference call and a second quota unit for a network blip.
     */
    data class FailedRetryable(
        val error: AgroError,
        val resumeFrom: DiagnosisState,
    ) : DiagnosisState

    /** Failed in a way retrying cannot fix: quota, plan, a photo the model rejects. */
    data class FailedPermanent(
        val error: AgroError,
        val photo: LocalPhoto?,
    ) : DiagnosisState
}

/** A processed photo on disk, plus what it cost to get there. */
data class LocalPhoto(
    /** Absolute path inside the app's private cache. Never a MediaStore uri. */
    val path: String,
    val originalBytes: Long,
    val uploadBytes: Long,
    val width: Int,
    val height: Int,
    val inputMethod: vn.agromind.app.core.model.InputMethod,
)

/** Which of the four steps the header shows. */
enum class FlowStep(val number: Int, val label: String, val shortLabel: String) {
    Photo(1, "Chọn ảnh", "Ảnh"),
    LeafCheck(2, "Xác nhận lá", "Lá"),
    Symptoms(3, "Thêm dấu hiệu", "Dấu hiệu"),
    Result(4, "Kết quả", "Kết quả"),
}

/**
 * Where the progress header should point for a given state.
 *
 * A failure does not move the header backwards: the grower is still on the step
 * they were on, and a header that jumps back to "Bước 1" while their photo is
 * still on screen reads as if the app threw their work away.
 */
fun DiagnosisState.step(): FlowStep = when (this) {
    DiagnosisState.Draft -> FlowStep.Photo
    is DiagnosisState.PhotoReady -> FlowStep.Photo
    is DiagnosisState.Analyzing -> FlowStep.LeafCheck
    is DiagnosisState.LeafRejected -> FlowStep.LeafCheck
    is DiagnosisState.AwaitingSymptoms -> FlowStep.Symptoms
    is DiagnosisState.Researching -> FlowStep.Result
    is DiagnosisState.Finalizing -> FlowStep.Result
    is DiagnosisState.Saved -> FlowStep.Result
    is DiagnosisState.FailedRetryable -> resumeFrom.step()
    is DiagnosisState.FailedPermanent -> if (photo == null) FlowStep.Photo else FlowStep.LeafCheck
}

/** The photo currently in play, if any. Used to keep the preview on screen. */
fun DiagnosisState.photoOrNull(): LocalPhoto? = when (this) {
    DiagnosisState.Draft -> null
    is DiagnosisState.PhotoReady -> photo
    is DiagnosisState.Analyzing -> photo
    is DiagnosisState.LeafRejected -> photo
    is DiagnosisState.AwaitingSymptoms -> photo
    is DiagnosisState.Researching -> photo
    is DiagnosisState.Finalizing -> photo
    is DiagnosisState.Saved -> null
    is DiagnosisState.FailedRetryable -> resumeFrom.photoOrNull()
    is DiagnosisState.FailedPermanent -> photo
}

// The loading stages live in `core/model` (LoadingStage.kt): StatusChain renders
// them, and a shared design-system component must not import a feature package.
