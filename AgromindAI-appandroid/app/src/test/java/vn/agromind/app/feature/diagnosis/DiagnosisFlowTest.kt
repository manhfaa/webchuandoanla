package vn.agromind.app.feature.diagnosis

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.model.Classification
import vn.agromind.app.core.model.InputMethod
import vn.agromind.app.core.model.LeafDetection
import vn.agromind.app.core.model.LoadingStage
import vn.agromind.app.core.model.Prediction
import vn.agromind.app.core.model.loadingStages
import vn.agromind.app.feature.diagnosis.domain.DiagnosisState
import vn.agromind.app.feature.diagnosis.domain.FlowStep
import vn.agromind.app.feature.diagnosis.domain.LocalPhoto
import vn.agromind.app.feature.diagnosis.domain.photoOrNull
import vn.agromind.app.feature.diagnosis.domain.step

/**
 * The rules of the leaf check, tested where they live.
 *
 * These are the ones that cost the grower something when they break: a wasted
 * quota unit, a lost photo, a research run they did not ask for, or a disease
 * name shown for a photo with no leaf in it.
 */
class DiagnosisFlowTest {

    private val photo = LocalPhoto(
        path = "/cache/leaf.jpg",
        originalBytes = 4_200_000,
        uploadBytes = 310_000,
        width = 1800,
        height = 1350,
        inputMethod = InputMethod.Capture,
    )

    private val leafFound = LeafDetection(isLeaf = true, confidence = 0.97, reason = "", regions = emptyList())
    private val noLeaf = LeafDetection(isLeaf = false, confidence = 0.12, reason = "Không thấy lá", regions = emptyList())

    private val classification = Classification(
        best = Prediction("Cà chua", "Mốc sương", 0.88),
        top = listOf(Prediction("Cà chua", "Mốc sương", 0.88)),
        modelVersion = "test",
        requestId = "cnn-0001",
    )

    @Test
    fun `skipping symptoms drops the source-matching stage entirely`() {
        // Listing a stage that will never run would leave a grey line on the
        // loading screen forever, which reads as a failure.
        assertFalse(loadingStages(withResearch = false).contains(LoadingStage.SourceMatch))
        assertTrue(loadingStages(withResearch = true).contains(LoadingStage.SourceMatch))
    }

    @Test
    fun `the stage list keeps its order in both shapes`() {
        assertEquals(
            listOf(
                LoadingStage.Uploading,
                LoadingStage.LeafCheck,
                LoadingStage.SignAnalysis,
                LoadingStage.PreparingActions,
            ),
            loadingStages(withResearch = false),
        )
        assertEquals(5, loadingStages(withResearch = true).size)
    }

    @Test
    fun `a rejected photo reports the leaf-check step, not the symptom step`() {
        val rejected = DiagnosisState.LeafRejected(photo, noLeaf)

        assertEquals(FlowStep.LeafCheck, rejected.step())
    }

    @Test
    fun `a failure does not move the progress header backwards`() {
        // The grower is still standing on the step they were on. A header that
        // jumps to "Bước 1" while their photo is still on screen reads as if the
        // app threw the work away.
        val awaiting = DiagnosisState.AwaitingSymptoms(photo, leafFound, classification, "đốm nâu")
        val failed = DiagnosisState.FailedRetryable(AgroError.Timeout(), resumeFrom = awaiting)

        assertEquals(awaiting.step(), failed.step())
    }

    @Test
    fun `a retryable failure still holds the photo`() {
        val awaiting = DiagnosisState.AwaitingSymptoms(photo, leafFound, classification, "đốm nâu")
        val failed = DiagnosisState.FailedRetryable(AgroError.Offline(), resumeFrom = awaiting)

        assertNotNull(failed.photoOrNull())
        assertEquals(photo.path, failed.photoOrNull()?.path)
    }

    @Test
    fun `a saved check no longer holds a working copy of the photo`() {
        // The record is on the server; keeping the cache file would grow the
        // cache without bound one leaf at a time.
        val saved = DiagnosisState.Saved(482, classification, research = null)

        assertEquals(null, saved.photoOrNull())
    }

    @Test
    fun `a classification with no predictions is not a zero percent result`() {
        val empty = Classification(best = null, top = emptyList(), modelVersion = "test", requestId = "x")

        assertFalse(empty.hasResult)
        assertEquals(
            vn.agromind.app.core.designsystem.components.ConfidenceBand.Recheck,
            empty.band,
        )
    }

    @Test
    fun `confidence bands split where the copy says they do`() {
        fun bandOf(confidence: Double) =
            classification.copy(best = Prediction("Cà chua", "Mốc sương", confidence)).band

        assertEquals(
            vn.agromind.app.core.designsystem.components.ConfidenceBand.High,
            bandOf(0.80),
        )
        assertEquals(
            vn.agromind.app.core.designsystem.components.ConfidenceBand.Watch,
            bandOf(0.79),
        )
        assertEquals(
            vn.agromind.app.core.designsystem.components.ConfidenceBand.Recheck,
            bandOf(0.54),
        )
    }

    @Test
    fun `percent rounds toward the reported confidence and stays in range`() {
        assertEquals(88, Prediction("a", "b", 0.887).percent)
        assertEquals(0, Prediction("a", "b", -1.0).percent)
        assertEquals(100, Prediction("a", "b", 5.0).percent)
    }
}
