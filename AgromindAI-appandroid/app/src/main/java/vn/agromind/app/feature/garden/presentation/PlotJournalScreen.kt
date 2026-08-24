package vn.agromind.app.feature.garden.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
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
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.CultivationLogDto
import vn.agromind.app.core.network.dto.CultivationLogWriteDto
import javax.inject.Inject

/**
 * The activity types the backend accepts, with the Vietnamese a grower uses.
 *
 * `water`/`fertilize` are the server's slugs; the label is what appears on the
 * quick-add row. Adding a type means adding it on the server first — a slug the
 * server does not know fails validation with a message nobody can act on.
 */
val ACTIVITY_TYPES = listOf(
    "water" to "Tưới",
    "fertilize" to "Bón",
    "observe" to "Quan sát",
    "prune" to "Tỉa",
    "cost" to "Chi phí",
    "note" to "Ghi chú",
)

data class JournalUiState(
    val loading: Boolean = true,
    val logs: List<CultivationLogDto> = emptyList(),
    val error: AgroError? = null,
    val composerType: String? = null,
    val title: String = "",
    val description: String = "",
    val cost: String = "",
    val submitting: Boolean = false,
)

@HiltViewModel
class PlotJournalViewModel @Inject constructor(
    private val api: FarmApi,
    savedState: SavedStateHandle,
) : ViewModel() {

    private val plotId: Int = savedState.get<String>("id")?.toIntOrNull() ?: -1

    private val _state = MutableStateFlow(JournalUiState())
    val state: StateFlow<JournalUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (plotId <= 0) {
            _state.value = JournalUiState(loading = false, error = AgroError.NotFound("Không tìm thấy lô này."))
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { api.logs(plotId) }) {
                is AgroResult.Ok -> _state.update {
                    it.copy(loading = false, logs = result.value, error = null)
                }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }

    fun openComposer(type: String) = _state.update {
        it.copy(composerType = type, title = "", description = "", cost = "")
    }

    fun closeComposer() = _state.update { it.copy(composerType = null) }
    fun onTitle(value: String) = _state.update { it.copy(title = value) }
    fun onDescription(value: String) = _state.update { it.copy(description = value) }
    fun onCost(value: String) = _state.update { it.copy(cost = value) }

    fun save(today: String) {
        val current = _state.value
        val type = current.composerType ?: return
        if (current.title.isBlank() || current.submitting) return

        _state.update { it.copy(submitting = true) }
        viewModelScope.launch {
            val body = CultivationLogWriteDto(
                plot = plotId,
                activityType = type,
                activityDate = today,
                title = current.title.trim(),
                description = current.description.trim(),
                costAmount = current.cost.replace(',', '.').trim().takeIf { it.isNotBlank() },
            )
            when (val result = ErrorMapper.guard { api.createLog(body) }) {
                is AgroResult.Ok -> {
                    _state.update {
                        // Prepended locally rather than refetching: the grower is
                        // standing in the plot and should see the entry land.
                        it.copy(
                            submitting = false,
                            composerType = null,
                            logs = listOf(result.value) + it.logs,
                        )
                    }
                }
                is AgroResult.Err -> _state.update {
                    it.copy(submitting = false, error = result.error)
                }
            }
        }
    }
}

/**
 * Nhật ký lô.
 *
 * A timeline rather than a list of cards: what a grower is reading for is "khi
 * nào tôi bón lần trước", and a vertical axis with dated nodes answers that at a
 * glance in a way a stack of equal-weight cards does not.
 *
 * Cost is shown in the soil colour and bold, because it is the one number in
 * here that gets totalled at the end of a season.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlotJournalScreen(
    plotName: String,
    today: String,
    onBack: () -> Unit,
    viewModel: PlotJournalViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.error != null && ui.logs.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa mở được nhật ký",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text(
            plotName.ifBlank { "Nhật ký lô" },
            style = AgroTheme.typography.screenTitle,
            color = colors.inkPrimary,
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        ) {
            ACTIVITY_TYPES.forEach { (slug, label) ->
                AssistChip(
                    onClick = { viewModel.openComposer(slug) },
                    label = { Text(label, style = AgroTheme.typography.label) },
                    shape = AgroTheme.shapes.chip,
                    modifier = Modifier.heightIn(min = 46.dp),
                )
            }
        }

        ui.composerType?.let { type ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.surface)
                    .border(1.dp, colors.divider, AgroTheme.shapes.card)
                    .padding(AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            ) {
                Text(
                    ACTIVITY_TYPES.first { it.first == type }.second,
                    style = AgroTheme.typography.bodyStrong,
                    color = colors.leafStrong,
                )
                OutlinedTextField(
                    value = ui.title,
                    onValueChange = viewModel::onTitle,
                    label = { Text("Bạn đã làm gì?") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = ui.description,
                    onValueChange = viewModel::onDescription,
                    label = { Text("Ghi chú thêm") },
                    modifier = Modifier.fillMaxWidth(),
                )
                if (type == "cost" || type == "fertilize") {
                    OutlinedTextField(
                        value = ui.cost,
                        onValueChange = viewModel::onCost,
                        label = { Text("Chi phí (đ)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                PrimaryButton(
                    label = "Ghi vào nhật ký",
                    loadingLabel = "Đang ghi…",
                    loading = ui.submitting,
                    enabled = ui.title.isNotBlank(),
                    onClick = { viewModel.save(today) },
                )
                vn.agromind.app.core.designsystem.components.SecondaryButton(
                    label = "Huỷ",
                    onClick = viewModel::closeComposer,
                )
            }
        }

        if (!ui.loading && ui.logs.isEmpty()) {
            Text(
                "Chưa có dòng nhật ký nào. Mỗi lần tưới, bón hay quan sát bạn ghi lại một dòng " +
                    "là sau này nhìn được cả mùa vụ.",
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        ui.logs.forEach { log -> TimelineEntry(log) }
    }
}

@Composable
private fun TimelineEntry(log: CultivationLogDto) {
    val colors = AgroTheme.colors
    val label = ACTIVITY_TYPES.firstOrNull { it.first == log.activityType }?.second ?: log.activityType
    val accent = when (log.activityType) {
        "water" -> colors.info
        "fertilize", "prune" -> colors.leafStrong
        "observe" -> colors.sun
        "cost" -> colors.soil
        else -> colors.inkSecondary
    }

    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        // The axis and the node. The node's thick canvas-coloured border is what
        // separates it from the line rather than sitting on top of it.
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(20.dp)) {
            Box(
                Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(accent)
                    .border(3.dp, colors.canvas, CircleShape),
            )
            Box(
                Modifier
                    .width(2.dp)
                    .height(56.dp)
                    .background(colors.divider),
            )
        }

        Spacer(Modifier.width(AgroSpacing.xs))

        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                "${log.activityDate} · $label",
                style = AgroTheme.typography.label,
                color = accent,
            )
            Text(log.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
            if (log.description.isNotBlank()) {
                Text(log.description, style = AgroTheme.typography.body, color = colors.inkSecondary)
            }
            log.costAmount?.let { amount ->
                Text(
                    amount.formatDong(),
                    style = AgroTheme.typography.bodyStrong,
                    color = colors.soil,
                )
            }
        }
    }
}

/** "1240000.00" → "1.240.000 đ". Grouped the way a Vietnamese price is written. */
private fun String.formatDong(): String {
    val whole = substringBefore('.').trimStart('-')
    val grouped = whole.reversed().chunked(3).joinToString(".").reversed()
    return "$grouped đ"
}
