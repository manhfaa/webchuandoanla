package vn.agromind.app.feature.home.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
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
import vn.agromind.app.core.designsystem.components.ConfidenceBand
import vn.agromind.app.core.designsystem.components.HistoryRow
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.DiagnosisApi
import vn.agromind.app.core.network.dto.UsageDto
import vn.agromind.app.feature.history.data.HistoryItem
import javax.inject.Inject

data class TodayUiState(
    val loading: Boolean = true,
    val usage: UsageDto? = null,
    val recent: List<HistoryItem> = emptyList(),
    val error: AgroError? = null,
) {
    /** How many of the recent results the grower should keep an eye on. */
    val needsWatching: Int
        get() = recent.count { it.confidencePercent != null && it.confidencePercent < 80 }
}

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val api: DiagnosisApi,
) : ViewModel() {

    private val _state = MutableStateFlow(TodayUiState())
    val state: StateFlow<TodayUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val usage = ErrorMapper.guard { api.usage() }
            val recent = ErrorMapper.guard { api.history(limit = 3, offset = 0) }

            // The screen is useful with either half. A failed usage call should
            // not blank out the three results that did load, and vice versa —
            // only a total failure becomes an error state.
            val items = (recent as? AgroResult.Ok)?.value?.results.orEmpty().map {
                HistoryItem(
                    id = it.id,
                    thumbnailUrl = it.thumbnailUrl,
                    plantName = it.plantName,
                    diseaseName = it.diseaseName,
                    confidencePercent = (it.cnnConfidence * 100).toInt()
                        .takeIf { p -> p > 0 && it.diseaseName.isNotBlank() },
                    isLeaf = it.isLeaf,
                    createdAt = it.createdAt,
                    beyondRetention = it.beyondRetention,
                )
            }

            _state.value = TodayUiState(
                loading = false,
                usage = usage.valueOrNull,
                recent = items,
                error = if (usage is AgroResult.Err && recent is AgroResult.Err) usage.error else null,
            )
        }
    }
}

/**
 * Hôm nay.
 *
 * Built so that within five seconds the grower can see: how much of their plan
 * is left, how many recent results need watching, and one obvious next action.
 * Everything on this screen is a real number from the server — there is no
 * placeholder metric and no invented "vườn khoẻ 92%".
 */
@Composable
fun TodayScreen(
    contentPadding: PaddingValues,
    onStartCheck: () -> Unit,
    onOpenResult: (Int) -> Unit,
    onSeeAll: () -> Unit,
    viewModel: TodayViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.error != null && ui.recent.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa tải được dữ liệu vườn",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                start = AgroSpacing.gutterCompact,
                end = AgroSpacing.gutterCompact,
                top = AgroSpacing.md,
                bottom = contentPadding.calculateBottomPadding() + AgroSpacing.lg,
            ),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.section),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(AgroTheme.shapes.cardLarge)
                .background(colors.forest)
                .padding(AgroSpacing.lg)
                .semantics(mergeDescendants = true) {},
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        ) {
            Text("TÌNH TRẠNG VƯỜN HÔM NAY", style = AgroTheme.typography.label, color = colors.mint)
            Text(
                text = when {
                    ui.recent.isEmpty() -> "Chưa có lần kiểm tra nào"
                    ui.needsWatching > 0 -> "${ui.needsWatching} kết quả gần đây cần để ý"
                    else -> "Các kết quả gần đây đều ở mức tin cậy cao"
                },
                style = AgroTheme.typography.display,
                color = colors.onForest,
            )
            Text(
                text = when {
                    ui.recent.isEmpty() ->
                        "Chụp một chiếc lá đang có dấu hiệu lạ, mình sẽ xem giúp bạn."
                    ui.needsWatching > 0 ->
                        "Bạn xem lại các kết quả bên dưới và theo dõi thêm vài ngày nhé."
                    else -> "Bạn vẫn nên đi thăm vườn và chụp lại nếu thấy dấu hiệu mới."
                },
                style = AgroTheme.typography.body,
                color = colors.mint,
            )
            Spacer(Modifier.height(AgroSpacing.xs))
            PrimaryButton(label = "Kiểm tra ảnh lá", onClick = onStartCheck)
        }

        ui.usage?.let { usage ->
            Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                Text("Gói ${usage.planName}", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
                Row(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    Metric(
                        label = "Lượt kiểm tra hôm nay",
                        value = usage.dailyDiagnoses.remaining?.toString() ?: "∞",
                        caption = usage.dailyDiagnoses.limit?.let { "còn lại trên $it" } ?: "không giới hạn",
                        modifier = Modifier.weight(1f),
                    )
                    Metric(
                        label = "Lượt trong tháng",
                        value = usage.monthlyDiagnoses.remaining?.toString() ?: "∞",
                        caption = usage.monthlyDiagnoses.limit?.let { "còn lại trên $it" } ?: "không giới hạn",
                        modifier = Modifier.weight(1f),
                    )
                }
                if (usage.history.notice.isNotBlank()) {
                    // Server-authored wording. Never re-phrased here: it is the
                    // sentence that explains why older results are not listed,
                    // and it must not drift from what the plan actually does.
                    Text(
                        usage.history.notice,
                        style = AgroTheme.typography.label,
                        color = colors.inkSecondary,
                    )
                }
            }
        }

        if (ui.recent.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                Text("Kết quả gần đây", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
                ui.recent.forEach { item ->
                    HistoryRow(
                        thumbnailUrl = item.thumbnailUrl,
                        plantName = item.plantName,
                        diseaseName = item.diseaseName,
                        confidencePercent = item.confidencePercent,
                        band = when {
                            item.confidencePercent == null -> ConfidenceBand.Recheck
                            item.confidencePercent >= 80 -> ConfidenceBand.High
                            item.confidencePercent >= 55 -> ConfidenceBand.Watch
                            else -> ConfidenceBand.Recheck
                        },
                        dateLabel = item.createdAt.take(10),
                        onClick = { onOpenResult(item.id) },
                    )
                }
                vn.agromind.app.core.designsystem.components.SecondaryButton(
                    label = "Xem tất cả",
                    onClick = onSeeAll,
                )
            }
        }
    }
}

@Composable
private fun Metric(label: String, value: String, caption: String, modifier: Modifier = Modifier) {
    val colors = AgroTheme.colors
    Column(
        modifier
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .padding(AgroSpacing.sm)
            // One node, one sentence: reading "18" and "Lượt kiểm tra hôm nay"
            // as two separate stops makes a TalkBack user reassemble the pair.
            .semantics(mergeDescendants = true) {
                contentDescription = "$label: $value, $caption"
            },
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(label, style = AgroTheme.typography.label, color = colors.inkSecondary)
        Text(value, style = AgroTheme.typography.confidence, color = colors.inkPrimary)
        Text(caption, style = AgroTheme.typography.label, color = colors.inkSecondary)
    }
}
