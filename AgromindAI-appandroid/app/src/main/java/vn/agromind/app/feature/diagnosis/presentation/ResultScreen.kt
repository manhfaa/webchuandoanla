package vn.agromind.app.feature.diagnosis.presentation

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.ConfidenceMeter
import vn.agromind.app.core.designsystem.components.LeafLensFrame
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SafetyNote
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.SourceList
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.model.Source
import vn.agromind.app.feature.diagnosis.data.DiagnosisRepository
import vn.agromind.app.feature.diagnosis.data.SavedDiagnosis
import javax.inject.Inject

data class ResultUiState(
    val loading: Boolean = true,
    val diagnosis: SavedDiagnosis? = null,
    val error: AgroError? = null,
)

@HiltViewModel
class ResultViewModel @Inject constructor(
    private val repository: DiagnosisRepository,
    savedState: SavedStateHandle,
) : ViewModel() {

    private val id: Int = savedState.get<String>("id")?.toIntOrNull() ?: -1

    private val _state = MutableStateFlow(ResultUiState())
    val state: StateFlow<ResultUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        if (id <= 0) {
            _state.value = ResultUiState(loading = false, error = AgroError.NotFound("Không tìm thấy kết quả này."))
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val result = repository.detail(id)) {
                is AgroResult.Ok -> _state.value = ResultUiState(loading = false, diagnosis = result.value)
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }
}

/**
 * Kết quả.
 *
 * The order on this screen is the argument it makes, and it is deliberately not
 * the order the data arrived in:
 *
 * 1. the photo and the single most likely answer,
 * 2. how confident that is, in words as well as a number,
 * 3. **what to do**, by when,
 * 4. only then the reasoning, the alternatives and the sources.
 *
 * A grower standing over a sick plant needs step 3. Leading with model
 * internals — top-5 tables, "YOLO xác thực" — would put the explanation in front
 * of the answer for someone who did not ask how it works.
 */
@Composable
fun ResultScreen(
    onAskAboutResult: (Int) -> Unit,
    onAddToJournal: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: ResultViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val colors = AgroTheme.colors

    // Sources open in the real browser. A third-party page rendered inside the
    // app frame reads as the app saying it, and this content is not ours.
    val openSource: (Source) -> Unit = { source ->
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(source.url)))
        }
    }

    when {
        ui.loading -> Column(
            Modifier.fillMaxSize().safeDrawingPadding(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator(color = colors.leaf)
        }

        ui.error != null -> StateBlock(
            art = StateArt.LeafLens,
            title = "Chưa mở được kết quả này",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::load),
            secondary = StateAction("Quay lại", onBack),
        )

        else -> {
            val d = ui.diagnosis ?: return
            Column(
                Modifier
                    .fillMaxSize()
                    .safeDrawingPadding()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AgroSpacing.section),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm)) {
                    LeafLensFrame(
                        imagePath = d.imageUrl.takeIf { it.isNotBlank() },
                        scrim = true,
                        contentDescription = "Ảnh lá của lần kiểm tra này",
                        modifier = Modifier.fillMaxWidth(),
                    )

                    if (d.leafOnly) {
                        // Says exactly what is known and no more.
                        Text(
                            "Ảnh lá hợp lệ, chưa có kết quả phân loại",
                            style = AgroTheme.typography.screenTitle,
                            color = colors.inkPrimary,
                        )
                        Text(
                            "Mình nhận ra đây là ảnh lá nhưng chưa đủ chắc để gọi tên bệnh. " +
                                "Bạn thử chụp lại gần hơn, hoặc chụp thêm một lá khác cùng dấu hiệu.",
                            style = AgroTheme.typography.body,
                            color = colors.inkSecondary,
                        )
                    } else {
                        Text(
                            "KHẢ NĂNG PHÙ HỢP NHẤT",
                            style = AgroTheme.typography.label,
                            color = colors.leafStrong,
                        )
                        Text(
                            listOf(d.plantName, d.diseaseName).filter { it.isNotBlank() }.joinToString(" · "),
                            style = AgroTheme.typography.screenTitle,
                            color = colors.inkPrimary,
                        )
                    }
                }

                ConfidenceMeter(percent = d.confidencePercent, band = d.band)

                if (d.research != null) {
                    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                        Text(
                            "Triệu chứng bạn kể có phù hợp không",
                            style = AgroTheme.typography.sectionTitle,
                            color = colors.inkPrimary,
                        )
                        Text(
                            if (d.research!!.isConsistent) "Khá phù hợp" else "Chưa phù hợp rõ",
                            style = AgroTheme.typography.bodyStrong,
                            color = if (d.research!!.isConsistent) colors.leafStrong else colors.sun,
                        )
                        Text(
                            d.research!!.compatibilitySummary,
                            style = AgroTheme.typography.body,
                            color = colors.inkSecondary,
                        )
                        Text(
                            d.research!!.confidenceNote,
                            style = AgroTheme.typography.label,
                            color = colors.inkSecondary,
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                        Text(
                            "Việc nên làm tiếp theo",
                            style = AgroTheme.typography.sectionTitle,
                            color = colors.inkPrimary,
                        )
                        Text(
                            d.research!!.treatmentSummary,
                            style = AgroTheme.typography.body,
                            color = colors.inkSecondary,
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                        Text("NGUỒN", style = AgroTheme.typography.label, color = colors.leafStrong)
                        SourceList(
                            sources = d.research!!.compatibilitySources + d.research!!.treatmentSources,
                            onOpen = openSource,
                        )
                    }
                } else if (d.symptoms.isBlank()) {
                    // No verification ran because none was asked for. Saying so
                    // is better than an empty section the grower reads as broken.
                    Text(
                        "Bạn đã bỏ qua phần mô tả dấu hiệu, nên lần này mình chưa đối chiếu với nguồn tham khảo.",
                        style = AgroTheme.typography.body,
                        color = colors.inkSecondary,
                    )
                }

                if (d.alternatives.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                        Text(
                            "Các khả năng khác",
                            style = AgroTheme.typography.sectionTitle,
                            color = colors.inkPrimary,
                        )
                        d.alternatives.forEach { alternative ->
                            HorizontalDivider(color = colors.divider)
                            Text(
                                "${alternative.label} — ${alternative.percent}%",
                                style = AgroTheme.typography.body,
                                color = colors.inkSecondary,
                            )
                        }
                    }
                }

                // Before the closing buttons in the reading order, so a TalkBack
                // user does not skip past it on the way to "Ghi vào nhật ký".
                SafetyNote(
                    d.research?.safetyNote?.takeIf { it.isNotBlank() }
                        ?: "Đây là kết quả tham khảo từ ảnh. Trước khi dùng thuốc, bạn hỏi thêm cán bộ khuyến nông " +
                        "hoặc kỹ thuật viên ở địa phương giúp mình nhé.",
                )

                Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    PrimaryButton(label = "Hỏi thêm về kết quả này", onClick = { onAskAboutResult(d.id) })
                    SecondaryButton(label = "Ghi vào nhật ký lô", onClick = { onAddToJournal(d.id) })
                }

                Spacer(Modifier.height(AgroSpacing.lg))
            }
        }
    }
}
