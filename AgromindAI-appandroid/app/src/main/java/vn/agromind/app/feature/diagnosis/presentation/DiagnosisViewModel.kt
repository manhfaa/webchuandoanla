package vn.agromind.app.feature.diagnosis.presentation

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.database.DiagnosisDraftEntity
import vn.agromind.app.core.model.InputMethod
import vn.agromind.app.core.model.LoadingStage
import vn.agromind.app.core.model.SymptomResearch
import vn.agromind.app.core.model.loadingStages
import vn.agromind.app.feature.diagnosis.data.DiagnosisRepository
import vn.agromind.app.feature.diagnosis.data.ImagePreprocessor
import vn.agromind.app.feature.diagnosis.data.UnreadablePhoto
import vn.agromind.app.feature.diagnosis.domain.DiagnosisState
import vn.agromind.app.feature.diagnosis.domain.FlowStep
import vn.agromind.app.feature.diagnosis.domain.LocalPhoto
import vn.agromind.app.feature.diagnosis.domain.photoOrNull
import vn.agromind.app.feature.diagnosis.domain.step
import javax.inject.Inject

data class DiagnosisUiState(
    val flow: DiagnosisState = DiagnosisState.Draft,
    /** Which line of the StatusChain is running. Null when nothing is in flight. */
    val stage: LoadingStage? = null,
    val stages: List<LoadingStage> = emptyList(),
    /** The stage that failed, so the chain can mark that line rather than all of them. */
    val failedStage: LoadingStage? = null,
    val restoring: Boolean = true,
) {
    val step: FlowStep get() = flow.step()
    val photo: LocalPhoto? get() = flow.photoOrNull()
    val busy: Boolean get() = stage != null
}

/**
 * Drives the four-step leaf check.
 *
 * Three rules live here rather than in the screens, because a screen can be
 * skipped, restored or navigated to sideways and these must hold anyway:
 *
 * 1. **A rejected photo never reaches the classifier.** The server enforces it
 *    too, but the app must not render a disease name it happens to have.
 * 2. **Skipping the description skips the verification run.** It is not a
 *    degraded path and must not quietly spend two Tavily searches.
 * 3. **A failure never costs the grower their input.** The photo, the symptoms
 *    and any completed server work stay in the draft, and a retry resumes from
 *    the step that broke instead of from the beginning.
 */
@HiltViewModel
class DiagnosisViewModel @Inject constructor(
    private val repository: DiagnosisRepository,
    private val images: ImagePreprocessor,
) : ViewModel() {

    private val _state = MutableStateFlow(DiagnosisUiState())
    val state: StateFlow<DiagnosisUiState> = _state.asStateFlow()

    /** The in-flight network call, so Huỷ can actually cancel it. */
    private var work: Job? = null

    private var cnnRequestId: String? = null
    private var researchRequestId: String? = null

    init {
        viewModelScope.launch { restore() }
    }

    /* ------------------------------------------------------------ step 1 --- */

    fun onPhotoPicked(uri: Uri, inputMethod: InputMethod) {
        work?.cancel()
        work = viewModelScope.launch {
            _state.update { it.copy(stage = LoadingStage.Uploading, stages = loadingStages(false)) }
            try {
                val photo = images.prepare(uri, inputMethod)
                // A new photo is a new check: the ids from the previous one must
                // not be reused, or the server would replay the old answer.
                cnnRequestId = null
                researchRequestId = null
                moveTo(DiagnosisState.PhotoReady(photo))
            } catch (e: UnreadablePhoto) {
                _state.update {
                    it.copy(
                        flow = DiagnosisState.FailedPermanent(
                            AgroError.BadImage(e.message.orEmpty()),
                            photo = null,
                        ),
                        stage = null,
                    )
                }
            }
        }
    }

    /** "Chụp lại" — drops the working copy so the cache does not accumulate. */
    fun retakePhoto() {
        viewModelScope.launch {
            _state.value.photo?.let { images.discard(it) }
            cnnRequestId = null
            researchRequestId = null
            moveTo(DiagnosisState.Draft)
        }
    }

    /* --------------------------------------------------- step 2: the gate --- */

    /** "Dùng ảnh này". Runs the leaf check and, if it passes, the classifier. */
    fun analyze() {
        val photo = _state.value.photo ?: return
        val requestId = cnnRequestId ?: repository.newRequestId().also { cnnRequestId = it }

        work?.cancel()
        work = viewModelScope.launch {
            moveTo(DiagnosisState.Analyzing(photo))
            _state.update {
                it.copy(
                    stage = LoadingStage.Uploading,
                    stages = loadingStages(false),
                    failedStage = null,
                )
            }

            when (val result = repository.classify(photo, requestId)) {
                is AgroResult.Ok -> {
                    val (detection, classification) = result.value
                    if (!detection.isLeaf) {
                        // Terminal for this photo. No classification is shown,
                        // even though one may have arrived alongside.
                        moveTo(DiagnosisState.LeafRejected(photo, detection))
                    } else {
                        moveTo(
                            DiagnosisState.AwaitingSymptoms(
                                photo = photo,
                                detection = detection,
                                classification = classification,
                                symptoms = currentSymptoms(),
                            ),
                        )
                    }
                    _state.update { it.copy(stage = null) }
                }

                is AgroResult.Err -> fail(
                    error = result.error,
                    stage = LoadingStage.LeafCheck,
                    resumeFrom = DiagnosisState.PhotoReady(photo),
                )
            }
        }
    }

    /* ------------------------------------------------------------ step 3 --- */

    fun onSymptomsChange(value: String) {
        val current = _state.value.flow
        if (current !is DiagnosisState.AwaitingSymptoms) return
        _state.update { it.copy(flow = current.copy(symptoms = value)) }
        // Persisted as they type, debounced by the fact that a draft write is a
        // single-row upsert. Losing three thumb-typed sentences to a phone call
        // is the failure this whole draft mechanism exists to prevent.
        viewModelScope.launch { persistDraft() }
    }

    /** "Bỏ qua bước này" — a supported choice, so no verification run happens. */
    fun skipSymptoms() = finish(withResearch = false)

    /** "Xem kết quả" — runs the verification only when there is something to verify. */
    fun submitSymptoms() {
        val current = _state.value.flow as? DiagnosisState.AwaitingSymptoms ?: return
        finish(withResearch = current.symptoms.isNotBlank())
    }

    private fun finish(withResearch: Boolean) {
        val current = _state.value.flow as? DiagnosisState.AwaitingSymptoms ?: return
        val symptoms = if (withResearch) current.symptoms.trim() else ""

        work?.cancel()
        work = viewModelScope.launch {
            _state.update {
                it.copy(stages = loadingStages(withResearch), failedStage = null)
            }

            val research = if (withResearch) {
                moveTo(
                    DiagnosisState.Researching(
                        current.photo,
                        current.detection,
                        current.classification,
                        symptoms,
                    ),
                )
                _state.update { it.copy(stage = LoadingStage.SourceMatch) }

                val id = researchRequestId ?: repository.newRequestId().also { researchRequestId = it }
                when (
                    val result = repository.research(
                        cnnRequestId = current.classification.requestId,
                        symptoms = symptoms,
                        requestId = id,
                    )
                ) {
                    is AgroResult.Ok -> result.value
                    is AgroResult.Err -> {
                        fail(
                            error = result.error,
                            stage = LoadingStage.SourceMatch,
                            resumeFrom = current.copy(symptoms = symptoms),
                        )
                        return@launch
                    }
                }
            } else {
                null
            }

            save(current, symptoms, research)
        }
    }

    private suspend fun save(
        current: DiagnosisState.AwaitingSymptoms,
        symptoms: String,
        research: SymptomResearch?,
    ) {
        moveTo(
            DiagnosisState.Finalizing(
                current.photo,
                current.detection,
                current.classification,
                symptoms,
                research,
            ),
        )
        _state.update { it.copy(stage = LoadingStage.PreparingActions) }

        when (
            val saved = repository.save(
                photo = current.photo,
                detection = current.detection,
                classification = current.classification,
                symptoms = symptoms,
                research = research,
            )
        ) {
            is AgroResult.Ok -> {
                _state.update {
                    it.copy(
                        flow = DiagnosisState.Saved(saved.value, current.classification, research),
                        stage = null,
                    )
                }
                // The record is on the server now; the working copy and the
                // draft have done their job.
                images.discard(current.photo)
                repository.clearDraft()
            }

            is AgroResult.Err -> {
                // The verification, if it ran, is kept in the draft — a failed
                // save must not cost a second research run on retry.
                research?.let { persistDraft(research = it) }
                fail(
                    error = saved.error,
                    stage = LoadingStage.PreparingActions,
                    resumeFrom = current.copy(symptoms = symptoms),
                )
            }
        }
    }

    /* ------------------------------------------------------ retry / cancel --- */

    fun retry() {
        val failed = _state.value.flow as? DiagnosisState.FailedRetryable ?: return
        when (val resume = failed.resumeFrom) {
            is DiagnosisState.PhotoReady -> {
                _state.update { it.copy(flow = resume) }
                analyze()
            }
            is DiagnosisState.AwaitingSymptoms -> {
                _state.update { it.copy(flow = resume) }
                finish(withResearch = resume.symptoms.isNotBlank())
            }
            else -> _state.update { it.copy(flow = resume) }
        }
    }

    /** "Huỷ" on the loading screen. Stops the call and returns to the last step. */
    fun cancel() {
        work?.cancel()
        work = null
        val flow = _state.value.flow
        val back = when (flow) {
            is DiagnosisState.Analyzing -> DiagnosisState.PhotoReady(flow.photo)
            is DiagnosisState.Researching -> DiagnosisState.AwaitingSymptoms(
                flow.photo, flow.detection, flow.classification, flow.symptoms,
            )
            is DiagnosisState.Finalizing -> DiagnosisState.AwaitingSymptoms(
                flow.photo, flow.detection, flow.classification, flow.symptoms,
            )
            else -> flow
        }
        _state.update { it.copy(flow = back, stage = null, failedStage = null) }
    }

    /** Leaving the flow for good. Clears the draft and the working copy. */
    fun discardEverything() {
        work?.cancel()
        viewModelScope.launch {
            _state.value.photo?.let { images.discard(it) }
            repository.clearDraft()
            cnnRequestId = null
            researchRequestId = null
            _state.value = DiagnosisUiState(restoring = false)
        }
    }

    /* --------------------------------------------------------------- draft --- */

    private suspend fun restore() {
        val draft = repository.loadDraft()
        if (draft?.photoPath == null || !java.io.File(draft.photoPath).exists()) {
            // A draft whose photo the OS has since cleaned out of the cache is
            // not recoverable, and offering to resume it would fail at upload.
            repository.clearDraft()
            _state.update { it.copy(restoring = false) }
            return
        }

        cnnRequestId = draft.cnnRequestId
        researchRequestId = draft.researchRequestId

        val photo = LocalPhoto(
            path = draft.photoPath,
            originalBytes = draft.originalBytes,
            uploadBytes = draft.uploadBytes,
            width = draft.photoWidth,
            height = draft.photoHeight,
            inputMethod = if (draft.inputMethod == InputMethod.Capture.wire) {
                InputMethod.Capture
            } else {
                InputMethod.Upload
            },
        )

        val detection = draft.detectionJson?.let(repository::decodeDetection)
        val classification = draft.classificationJson?.let(repository::decodeClassification)

        // Restored to the last step the grower actually completed, never mid-call:
        // a network request does not survive process death, and resuming into
        // "Analyzing" would show a spinner attached to nothing.
        val restored = when {
            detection != null && !detection.isLeaf -> DiagnosisState.LeafRejected(photo, detection)
            detection != null && classification != null -> DiagnosisState.AwaitingSymptoms(
                photo = photo,
                detection = detection,
                classification = classification,
                symptoms = draft.symptoms,
            )
            else -> DiagnosisState.PhotoReady(photo)
        }

        _state.update { it.copy(flow = restored, restoring = false) }
    }

    private suspend fun moveTo(next: DiagnosisState) {
        _state.update { it.copy(flow = next) }
        persistDraft()
    }

    private suspend fun persistDraft(research: SymptomResearch? = null) {
        val flow = _state.value.flow
        val photo = flow.photoOrNull()
        if (photo == null) {
            repository.clearDraft()
            return
        }

        val detection = when (flow) {
            is DiagnosisState.LeafRejected -> flow.detection
            is DiagnosisState.AwaitingSymptoms -> flow.detection
            is DiagnosisState.Researching -> flow.detection
            is DiagnosisState.Finalizing -> flow.detection
            else -> null
        }
        val classification = when (flow) {
            is DiagnosisState.AwaitingSymptoms -> flow.classification
            is DiagnosisState.Researching -> flow.classification
            is DiagnosisState.Finalizing -> flow.classification
            else -> null
        }

        repository.saveDraft(
            DiagnosisDraftEntity(
                photoPath = photo.path,
                originalBytes = photo.originalBytes,
                uploadBytes = photo.uploadBytes,
                photoWidth = photo.width,
                photoHeight = photo.height,
                inputMethod = photo.inputMethod.wire,
                cnnRequestId = cnnRequestId,
                researchRequestId = researchRequestId,
                symptoms = currentSymptoms(),
                detectionJson = detection?.let(repository::encodeDetection),
                classificationJson = classification?.let(repository::encodeClassification),
                researchJson = research?.let(repository::encodeResearch),
                stateName = flow::class.simpleName.orEmpty(),
            ),
        )
    }

    private fun currentSymptoms(): String = when (val flow = _state.value.flow) {
        is DiagnosisState.AwaitingSymptoms -> flow.symptoms
        is DiagnosisState.Researching -> flow.symptoms
        is DiagnosisState.Finalizing -> flow.symptoms
        is DiagnosisState.FailedRetryable -> when (val r = flow.resumeFrom) {
            is DiagnosisState.AwaitingSymptoms -> r.symptoms
            else -> ""
        }
        else -> ""
    }

    /**
     * A 402 is not retryable — the plan is the reason, and trying again would
     * only produce the same refusal. Everything else keeps the resume point.
     */
    private suspend fun fail(error: AgroError, stage: LoadingStage, resumeFrom: DiagnosisState) {
        val permanent = error is AgroError.PlanLimit || error is AgroError.BadImage
        _state.update {
            it.copy(
                flow = if (permanent) {
                    DiagnosisState.FailedPermanent(error, resumeFrom.photoOrNull())
                } else {
                    DiagnosisState.FailedRetryable(error, resumeFrom)
                },
                stage = null,
                failedStage = stage,
            )
        }
        persistDraft()
    }
}
