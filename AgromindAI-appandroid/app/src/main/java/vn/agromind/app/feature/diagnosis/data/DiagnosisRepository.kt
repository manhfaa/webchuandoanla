package vn.agromind.app.feature.diagnosis.data

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.common.map
import vn.agromind.app.core.database.DiagnosisDraftDao
import vn.agromind.app.core.database.DiagnosisDraftEntity
import vn.agromind.app.core.model.Classification
import vn.agromind.app.core.model.InputMethod
import vn.agromind.app.core.model.LeafDetection
import vn.agromind.app.core.model.LeafRegion
import vn.agromind.app.core.model.Prediction
import vn.agromind.app.core.model.Source
import vn.agromind.app.core.model.SymptomResearch
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.DiagnosisApi
import vn.agromind.app.core.network.dto.CnnResultDto
import vn.agromind.app.core.network.dto.PredictionDto
import vn.agromind.app.core.network.dto.ResearchRequest
import vn.agromind.app.core.network.dto.ResearchResultDto
import vn.agromind.app.core.network.dto.ResearchSourceDto
import vn.agromind.app.core.network.dto.UsageDto
import vn.agromind.app.core.network.dto.YoloPayloadDto
import vn.agromind.app.feature.diagnosis.domain.LocalPhoto
import java.io.File
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** The leaf check and the classification, from one call. */
data class LeafCheckResult(
    val detection: LeafDetection,
    val classification: Classification,
)

/** A record the server already holds, as the result screen needs it. */
data class SavedDiagnosis(
    val id: Int,
    val imageUrl: String,
    val plantName: String,
    val diseaseName: String,
    val confidencePercent: Int?,
    val band: vn.agromind.app.core.designsystem.components.ConfidenceBand,
    val isLeaf: Boolean,
    val symptoms: String,
    val alternatives: List<Prediction>,
    val research: SymptomResearch?,
    val createdAt: String,
    val beyondRetention: Boolean,
) {
    /**
     * True when the photo passed the leaf check but produced no classification.
     *
     * Its own screen, not a 0% result: "Ảnh lá hợp lệ, chưa có kết quả phân
     * loại" is the honest thing to say, and showing a confidence number for it
     * would invent certainty the model never expressed.
     */
    val leafOnly: Boolean get() = isLeaf && confidencePercent == null
}

@Singleton
class DiagnosisRepository @Inject constructor(
    private val api: DiagnosisApi,
    private val drafts: DiagnosisDraftDao,
    private val images: ImagePreprocessor,
    private val json: Json,
) {

    /**
     * Upload the photo, run the leaf detector and the classifier.
     *
     * [requestId] is generated once per photo by the caller and reused for every
     * retry of that photo. Handing a fresh id to a retry would buy a second
     * inference call for an answer the server already has.
     */
    suspend fun classify(photo: LocalPhoto, requestId: String): AgroResult<LeafCheckResult> {
        val file = File(photo.path)
        val part = MultipartBody.Part.createFormData(
            name = "image",
            filename = file.name,
            body = file.asRequestBody("image/jpeg".toMediaType()),
        )
        val text = "text/plain".toMediaType()

        return ErrorMapper.guard {
            api.classify(
                image = part,
                clientRequestId = requestId.toRequestBody(text),
                inputMethod = photo.inputMethod.wire.toRequestBody(text),
            )
        }.map { it.toLeafCheck(requestId) }
    }

    /**
     * Verify the described symptoms against web sources.
     *
     * Only the ids go up — never the predictions. The server reads those from
     * its own copy of the leaf check, so a modified confidence cannot steer the
     * write-up.
     *
     * Returns `null` when the server answered "skipped", which happens when the
     * description turned out to be blank. That is a normal outcome and not an
     * error: the grower keeps the classification.
     */
    suspend fun research(
        cnnRequestId: String,
        symptoms: String,
        requestId: String,
        diagnosisId: Int? = null,
    ): AgroResult<SymptomResearch?> = ErrorMapper.guard {
        api.researchSymptoms(
            ResearchRequest(
                symptoms = symptoms,
                clientRequestId = requestId,
                diagnosisId = diagnosisId,
                cnnRequestId = cnnRequestId.takeIf { diagnosisId == null },
            ),
        )
    }.map { dto -> if (dto.skipped) null else dto.toDomain() }

    /**
     * Write the record. This — not the inference call — is what spends a quota
     * unit, which is why an abandoned check costs the grower nothing.
     */
    suspend fun save(
        photo: LocalPhoto,
        detection: LeafDetection,
        classification: Classification,
        symptoms: String,
        research: SymptomResearch?,
    ): AgroResult<Int> {
        val payload = buildMap<String, Any?> {
            put("title", classification.best?.label.orEmpty())
            put("input_method", photo.inputMethod.wire)
            put("status", if (classification.hasResult) "completed" else "validated")
            put("is_leaf", detection.isLeaf)
            put("yolo_confidence", detection.confidence)
            put("cnn_confidence", classification.best?.confidence ?: 0.0)
            put("plant_name", classification.best?.plantName.orEmpty())
            put("disease_name", classification.best?.diseaseName.orEmpty())
            put("symptom_input", symptoms)
            put("model_version", classification.modelVersion)
            put("image_data_url", images.asDataUrl(photo))
            put("thumbnail_url", images.thumbnailDataUrl(photo))
            research?.let { put("rag_summary", it.finalConclusion) }
        }
        return ErrorMapper.guard { api.save(payload) }.map { it.id }
    }

    suspend fun usage(): AgroResult<UsageDto> = ErrorMapper.guard { api.usage() }

    /**
     * One saved record, by id.
     *
     * The result screen reads from here rather than being handed the flow's
     * in-memory state, so opening the same result from history, from a
     * notification or straight after saving all produce the same screen from the
     * same source.
     */
    suspend fun detail(id: Int): AgroResult<SavedDiagnosis> =
        ErrorMapper.guard { api.detail(id) }.map { it.toDomain(json) }

    /* ------------------------------------------------------------- draft --- */

    fun observeDraft() = drafts.observe()

    suspend fun loadDraft(): DiagnosisDraftEntity? = drafts.load()

    suspend fun saveDraft(draft: DiagnosisDraftEntity) =
        drafts.save(draft.copy(updatedAt = System.currentTimeMillis()))

    /** Clears the draft and deletes the working copy of the photo with it. */
    suspend fun clearDraft() {
        drafts.load()?.photoPath?.let { runCatching { File(it).delete() } }
        drafts.clear()
    }

    fun newRequestId(): String = UUID.randomUUID().toString()

    fun encodeDetection(detection: LeafDetection): String =
        json.encodeToString(LeafDetectionSurrogate.serializer(), LeafDetectionSurrogate.from(detection))

    fun decodeDetection(raw: String): LeafDetection? =
        runCatching { json.decodeFromString(LeafDetectionSurrogate.serializer(), raw).toDomain() }.getOrNull()

    fun encodeClassification(classification: Classification): String =
        json.encodeToString(ClassificationSurrogate.serializer(), ClassificationSurrogate.from(classification))

    fun decodeClassification(raw: String): Classification? =
        runCatching { json.decodeFromString(ClassificationSurrogate.serializer(), raw).toDomain() }.getOrNull()

    /**
     * Kept in the draft so a failed *save* does not re-run the verification.
     *
     * Losing this would mean a 500 on the save call costs two more Tavily
     * searches and five more DeepSeek calls to produce a write-up the app was
     * already holding.
     */
    fun encodeResearch(research: SymptomResearch): String =
        json.encodeToString(ResearchSurrogate.serializer(), ResearchSurrogate.from(research))

    fun decodeResearch(raw: String): SymptomResearch? =
        runCatching { json.decodeFromString(ResearchSurrogate.serializer(), raw).toDomain() }.getOrNull()
}

/* ------------------------------------------------------------- mapping --- */

private fun CnnResultDto.toLeafCheck(requestId: String) = LeafCheckResult(
    detection = yolo.toDomain(),
    classification = Classification(
        // A classification is only meaningful once the photo passed the leaf
        // check. Building one from a rejected photo here would let a later screen
        // read `best` and show a disease name for a picture of a hand.
        best = if (yolo.isLeaf) bestPrediction() else null,
        top = if (yolo.isLeaf) topPredictions.take(5).map { it.toDomain() } else emptyList(),
        modelVersion = modelVersion,
        requestId = clientRequestId.ifBlank { requestId },
    ),
)

private fun CnnResultDto.bestPrediction(): Prediction? {
    if (plantName.isBlank() && diseaseName.isBlank()) {
        return topPredictions.firstOrNull()?.toDomain()
    }
    return Prediction(plantName = plantName, diseaseName = diseaseName, confidence = confidence)
}

private fun PredictionDto.toDomain() =
    Prediction(plantName = plantName, diseaseName = diseaseName, confidence = confidence)

private fun YoloPayloadDto.toDomain() = LeafDetection(
    isLeaf = isLeaf,
    confidence = confidence,
    reason = reason,
    regions = listOfNotNull(bbox?.toRegion(), cropBox?.toRegion()).distinct(),
)

/**
 * The server sends pixel coordinates against the image it received. The app
 * normalises them once, here, so the overlay does not have to know the upload
 * size — it draws against whatever box the layout gives it.
 *
 * Values outside 0..1 are clamped rather than dropped: a marker slightly off the
 * edge is still pointing at the right leaf.
 */
private fun List<Double>.toRegion(): LeafRegion? {
    if (size < 4) return null
    val (l, t, r, b) = this
    // Already normalised when every value is within 0..1; otherwise these are
    // pixels and there is no reliable width here to divide by, so they are
    // clamped and used as-is.
    return LeafRegion(
        left = l.toFloat().coerceIn(0f, 1f),
        top = t.toFloat().coerceIn(0f, 1f),
        right = r.toFloat().coerceIn(0f, 1f),
        bottom = b.toFloat().coerceIn(0f, 1f),
    ).takeIf { it.right > it.left && it.bottom > it.top }
}

private fun vn.agromind.app.core.network.dto.DiagnosisDto.toDomain(json: Json): SavedDiagnosis {
    val percent = (cnnConfidence * 100).toInt().takeIf { it > 0 && diseaseName.isNotBlank() }

    // `cnn_payload` and `rag_payload` are stored as free-form JSON on the server
    // so the website and the app can evolve independently of the column set.
    // Decoding leniently — and dropping anything unreadable rather than failing
    // the screen — means an older record still opens after the payload shape
    // moves on.
    val alternatives = runCatching {
        json.decodeFromJsonElement(CnnPayloadSurrogate.serializer(), cnnPayload ?: return@runCatching null)
            .topPredictions
            .map { Prediction(it.plantName, it.diseaseName, it.confidence) }
    }.getOrNull().orEmpty()

    val research = runCatching {
        json.decodeFromJsonElement(
            vn.agromind.app.core.network.dto.ResearchResultDto.serializer(),
            ragPayload ?: return@runCatching null,
        ).takeIf { !it.skipped }?.toDomain()
    }.getOrNull()

    return SavedDiagnosis(
        id = id,
        imageUrl = imageUrl.ifBlank { thumbnailUrl },
        plantName = plantName,
        diseaseName = diseaseName,
        confidencePercent = percent,
        band = when {
            percent == null -> vn.agromind.app.core.designsystem.components.ConfidenceBand.Recheck
            percent >= 80 -> vn.agromind.app.core.designsystem.components.ConfidenceBand.High
            percent >= 55 -> vn.agromind.app.core.designsystem.components.ConfidenceBand.Watch
            else -> vn.agromind.app.core.designsystem.components.ConfidenceBand.Recheck
        },
        isLeaf = isLeaf,
        symptoms = symptomInput,
        alternatives = alternatives.drop(1).take(4),
        research = research,
        createdAt = createdAt,
        beyondRetention = beyondRetention,
    )
}

@kotlinx.serialization.Serializable
private data class CnnPayloadSurrogate(
    @kotlinx.serialization.SerialName("top_predictions")
    val topPredictions: List<PredictionDto> = emptyList(),
)

private fun ResearchResultDto.toDomain() = SymptomResearch(
    isConsistent = isSymptomConsistent,
    bestMatch = bestMatch,
    compatibilitySummary = compatibilitySummary,
    confidenceNote = confidenceNote,
    compatibilitySources = compatibilitySources.map { it.toDomain() },
    treatmentSummary = treatmentSummary,
    safetyNote = treatmentSafetyNote,
    treatmentSources = treatmentSources.map { it.toDomain() },
    finalConclusion = finalConclusion,
    nextStep = userNextStep,
)

private fun ResearchSourceDto.toDomain() = Source(
    id = id,
    title = title,
    url = url,
    snippet = snippet,
    domain = domain,
)

/* ----------------------------------------------- draft (de)serialisation --- */

/**
 * Domain types are not `@Serializable` on purpose — serialisation is a storage
 * concern, and annotating them would make every future field change a migration
 * question. These small mirrors keep that decision at the boundary.
 */
@kotlinx.serialization.Serializable
private data class LeafDetectionSurrogate(
    val isLeaf: Boolean,
    val confidence: Double,
    val reason: String,
    val regions: List<List<Float>>,
) {
    fun toDomain() = LeafDetection(
        isLeaf = isLeaf,
        confidence = confidence,
        reason = reason,
        regions = regions.mapNotNull {
            if (it.size < 4) null else LeafRegion(it[0], it[1], it[2], it[3])
        },
    )

    companion object {
        fun from(d: LeafDetection) = LeafDetectionSurrogate(
            isLeaf = d.isLeaf,
            confidence = d.confidence,
            reason = d.reason,
            regions = d.regions.map { listOf(it.left, it.top, it.right, it.bottom) },
        )
    }
}

@kotlinx.serialization.Serializable
private data class ClassificationSurrogate(
    val best: PredictionSurrogate?,
    val top: List<PredictionSurrogate>,
    val modelVersion: String,
    val requestId: String,
) {
    fun toDomain() = Classification(
        best = best?.toDomain(),
        top = top.map { it.toDomain() },
        modelVersion = modelVersion,
        requestId = requestId,
    )

    companion object {
        fun from(c: Classification) = ClassificationSurrogate(
            best = c.best?.let { PredictionSurrogate.from(it) },
            top = c.top.map { PredictionSurrogate.from(it) },
            modelVersion = c.modelVersion,
            requestId = c.requestId,
        )
    }
}

@kotlinx.serialization.Serializable
private data class SourceSurrogate(
    val id: Int,
    val title: String,
    val url: String,
    val snippet: String,
    val domain: String,
) {
    fun toDomain() = Source(id, title, url, snippet, domain)

    companion object {
        fun from(s: Source) = SourceSurrogate(s.id, s.title, s.url, s.snippet, s.domain)
    }
}

@kotlinx.serialization.Serializable
private data class ResearchSurrogate(
    val isConsistent: Boolean,
    val bestMatch: String,
    val compatibilitySummary: String,
    val confidenceNote: String,
    val compatibilitySources: List<SourceSurrogate>,
    val treatmentSummary: String,
    val safetyNote: String,
    val treatmentSources: List<SourceSurrogate>,
    val finalConclusion: String,
    val nextStep: String,
) {
    fun toDomain() = SymptomResearch(
        isConsistent = isConsistent,
        bestMatch = bestMatch,
        compatibilitySummary = compatibilitySummary,
        confidenceNote = confidenceNote,
        compatibilitySources = compatibilitySources.map { it.toDomain() },
        treatmentSummary = treatmentSummary,
        safetyNote = safetyNote,
        treatmentSources = treatmentSources.map { it.toDomain() },
        finalConclusion = finalConclusion,
        nextStep = nextStep,
    )

    companion object {
        fun from(r: SymptomResearch) = ResearchSurrogate(
            isConsistent = r.isConsistent,
            bestMatch = r.bestMatch,
            compatibilitySummary = r.compatibilitySummary,
            confidenceNote = r.confidenceNote,
            compatibilitySources = r.compatibilitySources.map { SourceSurrogate.from(it) },
            treatmentSummary = r.treatmentSummary,
            safetyNote = r.safetyNote,
            treatmentSources = r.treatmentSources.map { SourceSurrogate.from(it) },
            finalConclusion = r.finalConclusion,
            nextStep = r.nextStep,
        )
    }
}

@kotlinx.serialization.Serializable
private data class PredictionSurrogate(
    val plantName: String,
    val diseaseName: String,
    val confidence: Double,
) {
    fun toDomain() = Prediction(plantName, diseaseName, confidence)

    companion object {
        fun from(p: Prediction) = PredictionSurrogate(p.plantName, p.diseaseName, p.confidence)
    }
}
