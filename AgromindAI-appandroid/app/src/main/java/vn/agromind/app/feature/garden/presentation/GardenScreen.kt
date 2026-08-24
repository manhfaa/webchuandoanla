package vn.agromind.app.feature.garden.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.FarmPlotDto
import javax.inject.Inject

/** The four units the backend accepts. Not a free-text field — the server validates it. */
val AREA_UNITS = listOf("m2", "ha", "sào", "công")

data class GardenUiState(
    val loading: Boolean = true,
    val plots: List<FarmPlotDto> = emptyList(),
    val cached: Boolean = false,
    val error: AgroError? = null,
)

@HiltViewModel
class GardenViewModel @Inject constructor(
    private val api: FarmApi,
    private val cache: OfflineCache,
) : ViewModel() {

    private val _state = MutableStateFlow(GardenUiState())
    val state: StateFlow<GardenUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            cache.plots()?.takeIf { it.isNotEmpty() }?.let { cached ->
                _state.value = GardenUiState(loading = true, plots = cached, cached = true)
            }
            when (val result = ErrorMapper.guard { api.plots() }) {
                is AgroResult.Ok -> {
                    cache.savePlots(result.value)
                    _state.value = GardenUiState(loading = false, plots = result.value)
                }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }
}

/**
 * Vườn.
 *
 * A plot is the unit a grower actually thinks in — "lô sầu riêng sau nhà" — and
 * everything else in this section hangs off one: the journal, the traceability
 * page, and which plot a pest alert is about. So the list is the entry point,
 * not a settings screen buried under it.
 */
@Composable
fun GardenScreen(
    contentPadding: PaddingValues,
    onOpenPlot: (Int) -> Unit,
    onAddPlot: () -> Unit,
    onTraceability: () -> Unit,
    viewModel: GardenViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.error != null && ui.plots.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa tải được danh sách lô",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
        )
        return
    }

    if (!ui.loading && ui.plots.isEmpty()) {
        StateBlock(
            art = StateArt.LeafLens,
            title = "Chưa có lô vườn nào",
            body = "Thêm một lô để ghi nhật ký chăm sóc và gắn kết quả kiểm tra lá vào đúng chỗ.",
            primary = StateAction("Thêm lô vườn", onAddPlot),
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
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
    ) {
        Text("Vườn của bạn", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
        if (ui.cached) {
            Text("Dữ liệu đã lưu trên máy", style = AgroTheme.typography.label, color = colors.inkSecondary)
        }
        Spacer(Modifier.size(AgroSpacing.xxs))

        ui.plots.forEach { plot ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.surface)
                    .border(1.dp, colors.divider, AgroTheme.shapes.card)
                    .clickable { onOpenPlot(plot.id) }
                    .padding(AgroSpacing.md)
                    .heightIn(min = AgroSpacing.minTouch)
                    .semantics(mergeDescendants = true) {
                        contentDescription = buildString {
                            append(plot.name)
                            if (plot.cropType.isNotBlank()) append(", ${plot.cropType}")
                            append(", ${plot.areaLabel()}")
                            if (plot.growthStage.isNotBlank()) append(", giai đoạn ${plot.growthStage}")
                        }
                    },
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(plot.name, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                    if (plot.growthStage.isNotBlank()) {
                        Text(plot.growthStage, style = AgroTheme.typography.label, color = colors.leafStrong)
                    }
                }
                Text(
                    listOf(plot.cropType, plot.areaLabel()).filter { it.isNotBlank() }.joinToString(" · "),
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                if (plot.addressText.isNotBlank()) {
                    Text(plot.addressText, style = AgroTheme.typography.label, color = colors.inkSecondary)
                }
            }
        }

        Spacer(Modifier.size(AgroSpacing.xs))
        SecondaryButton(label = "QR truy xuất nguồn gốc", onClick = onTraceability)
        PrimaryButton(label = "Thêm lô vườn", onClick = onAddPlot)
    }
}

/**
 * "1.200 m2" rather than "1200.00 m2".
 *
 * The trailing zeros come from a `DecimalField` on the server and mean nothing
 * to a grower reading their own plot size.
 */
fun FarmPlotDto.areaLabel(): String {
    val value = areaValue?.trimEnd('0')?.trimEnd('.')?.takeIf { it.isNotBlank() } ?: return ""
    return "$value $areaUnit"
}
