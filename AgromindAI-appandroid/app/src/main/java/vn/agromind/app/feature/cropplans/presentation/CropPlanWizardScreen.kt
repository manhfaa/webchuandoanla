package vn.agromind.app.feature.cropplans.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.KeyboardType
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
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.LeafVeinProgress
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.CropPlanApi
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.CropDto
import vn.agromind.app.core.network.dto.CropPlanCreateRequest
import vn.agromind.app.core.network.dto.CropPlanDetailDto
import vn.agromind.app.core.network.dto.FarmLocationDto
import javax.inject.Inject

data class WizardUiState(
    val step: Int = 1,
    val crops: List<CropDto> = emptyList(),
    val locations: List<FarmLocationDto> = emptyList(),
    val cropSlug: String = "",
    val locationId: Int? = null,
    val startDate: String = "",
    val plantCount: String = "1",
    val plantingMode: String = "ground",
    val preview: CropPlanDetailDto? = null,
    val busy: Boolean = false,
    val error: AgroError? = null,
    val createdId: Int? = null,
) {
    val canPreview: Boolean
        get() = cropSlug.isNotBlank() && locationId != null && startDate.isNotBlank() && !busy
}

@HiltViewModel
class CropPlanWizardViewModel @Inject constructor(
    private val api: CropPlanApi,
    private val farmApi: FarmApi,
) : ViewModel() {

    private val _state = MutableStateFlow(WizardUiState())
    val state: StateFlow<WizardUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val crops = ErrorMapper.guard { api.crops() }
            val locations = ErrorMapper.guard { farmApi.locations() }
            _state.update {
                it.copy(
                    crops = crops.valueOrNull.orEmpty(),
                    locations = locations.valueOrNull.orEmpty()
                        .filter { l -> l.latitude != null && l.longitude != null },
                    error = (crops as? AgroResult.Err)?.error,
                )
            }
        }
    }

    fun onCrop(slug: String) = _state.update { it.copy(cropSlug = slug, error = null) }
    fun onLocation(id: Int) = _state.update { it.copy(locationId = id, error = null) }
    fun onStartDate(value: String) = _state.update { it.copy(startDate = value, error = null) }
    fun onPlantCount(value: String) = _state.update { it.copy(plantCount = value) }
    fun onMode(value: String) = _state.update { it.copy(plantingMode = value) }
    fun back() = _state.update { it.copy(step = (it.step - 1).coerceAtLeast(1), error = null) }
    fun next() = _state.update { it.copy(step = (it.step + 1).coerceAtMost(4)) }

    private fun request() = _state.value.let {
        CropPlanCreateRequest(
            cropType = it.cropSlug,
            startDate = it.startDate,
            plantingMode = it.plantingMode,
            plantCount = it.plantCount.toIntOrNull()?.coerceAtLeast(1) ?: 1,
            locationId = it.locationId,
        )
    }

    /**
     * Step 4 is a preview, and the preview costs nothing.
     *
     * The plan quota is two per month on Grow. Letting a grower see what the
     * planner produced *before* one of those is spent is the difference between
     * a wizard they can explore and one they have to get right first time.
     */
    fun preview() {
        if (!_state.value.canPreview) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { api.preview(request()) }) {
                is AgroResult.Ok -> _state.update {
                    it.copy(busy = false, preview = result.value, step = 4)
                }
                is AgroResult.Err -> _state.update { it.copy(busy = false, error = result.error) }
            }
        }
    }

    fun create() {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { api.create(request()) }) {
                is AgroResult.Ok -> _state.update { it.copy(busy = false, createdId = result.value.id) }
                is AgroResult.Err -> _state.update { it.copy(busy = false, error = result.error) }
            }
        }
    }
}

/**
 * Tạo kế hoạch trồng.
 *
 * Four steps, and the fourth is a preview rather than a confirmation dialog:
 * the planner's output is long enough that "bạn có chắc không?" would be asking
 * someone to agree to something they have not read.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CropPlanWizardScreen(
    onCreated: (Int) -> Unit,
    onCancel: () -> Unit,
    onUpgrade: () -> Unit,
    viewModel: CropPlanWizardViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    LaunchedEffect(ui.createdId) { ui.createdId?.let(onCreated) }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        LeafVeinProgress(
            step = ui.step,
            labels = listOf("Chọn cây", "Vị trí", "Ngày bắt đầu", "Xem trước"),
            shortLabels = listOf("Cây", "Vị trí", "Ngày", "Xem"),
        )

        when (ui.step) {
            1 -> {
                Text("Bạn muốn trồng cây gì?", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
                    verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
                ) {
                    ui.crops.forEach { crop ->
                        FilterChip(
                            selected = ui.cropSlug == crop.slug,
                            onClick = { viewModel.onCrop(crop.slug) },
                            label = { Text(crop.name, style = AgroTheme.typography.label) },
                            shape = AgroTheme.shapes.chip,
                            modifier = Modifier.heightIn(min = 46.dp),
                        )
                    }
                }
                PrimaryButton(
                    label = "Tiếp",
                    enabled = ui.cropSlug.isNotBlank(),
                    onClick = viewModel::next,
                )
            }

            2 -> {
                Text("Trồng ở đâu?", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
                if (ui.locations.isEmpty()) {
                    // Cannot be worked around here: the planner needs coordinates
                    // to fetch the climate series it plans against.
                    Text(
                        "Bạn cần một lô vườn có địa chỉ trước đã. Mình dùng vị trí đó để lấy dữ liệu " +
                            "khí hậu cho kế hoạch.",
                        style = AgroTheme.typography.body,
                        color = colors.inkSecondary,
                    )
                    SecondaryButton(label = "Quay lại", onClick = onCancel)
                } else {
                    ui.locations.forEach { location ->
                        FilterChip(
                            selected = ui.locationId == location.id,
                            onClick = { viewModel.onLocation(location.id) },
                            label = { Text(location.name, style = AgroTheme.typography.label) },
                            shape = AgroTheme.shapes.chip,
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 48.dp),
                        )
                    }
                    PrimaryButton(label = "Tiếp", enabled = ui.locationId != null, onClick = viewModel::next)
                    SecondaryButton(label = "Quay lại", onClick = viewModel::back)
                }
            }

            3 -> {
                Text("Bắt đầu khi nào?", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
                OutlinedTextField(
                    value = ui.startDate,
                    onValueChange = viewModel::onStartDate,
                    label = { Text("Ngày bắt đầu (YYYY-MM-DD)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = ui.plantCount,
                    onValueChange = viewModel::onPlantCount,
                    label = { Text("Số cây") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    listOf("ground" to "Trồng đất", "pot" to "Trồng chậu").forEach { (slug, label) ->
                        FilterChip(
                            selected = ui.plantingMode == slug,
                            onClick = { viewModel.onMode(slug) },
                            label = { Text(label, style = AgroTheme.typography.label) },
                            shape = AgroTheme.shapes.chip,
                            modifier = Modifier.heightIn(min = 46.dp),
                        )
                    }
                }
                ui.error?.let { Text(it.message, style = AgroTheme.typography.body, color = colors.danger) }
                PrimaryButton(
                    label = "Xem trước kế hoạch",
                    loadingLabel = "Đang dựng kế hoạch…",
                    loading = ui.busy,
                    enabled = ui.canPreview,
                    onClick = viewModel::preview,
                )
                SecondaryButton(label = "Quay lại", onClick = viewModel::back)
            }

            else -> {
                val preview = ui.preview
                Text("Xem trước", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
                Text(
                    "Kế hoạch dưới đây chưa được lưu và chưa trừ lượt của bạn.",
                    style = AgroTheme.typography.label,
                    color = colors.leafStrong,
                )

                preview?.let {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(AgroTheme.shapes.card)
                            .background(colors.surface)
                            .border(1.dp, colors.divider, AgroTheme.shapes.card)
                            .padding(AgroSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(it.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                        if (it.summary.isNotBlank()) {
                            Text(it.summary, style = AgroTheme.typography.body, color = colors.inkSecondary)
                        }
                        Text(
                            "${it.steps.size} bước",
                            style = AgroTheme.typography.label,
                            color = colors.leafStrong,
                        )
                        it.steps.take(5).forEach { step ->
                            Text(
                                "${step.stepNumber}. ${step.title}",
                                style = AgroTheme.typography.body,
                                color = colors.inkSecondary,
                            )
                        }
                        if (it.steps.size > 5) {
                            Text(
                                "…và ${it.steps.size - 5} bước nữa",
                                style = AgroTheme.typography.label,
                                color = colors.inkSecondary,
                            )
                        }
                    }
                }

                ui.error?.let { error ->
                    Text(error.message, style = AgroTheme.typography.body, color = colors.danger)
                    if (error is AgroError.PlanLimit) {
                        SecondaryButton(label = "Xem gói dịch vụ", onClick = onUpgrade)
                    }
                }

                PrimaryButton(
                    label = "Tạo kế hoạch",
                    loadingLabel = "Đang tạo…",
                    loading = ui.busy,
                    onClick = viewModel::create,
                )
                SecondaryButton(label = "Quay lại sửa", onClick = viewModel::back)
            }
        }
    }
}
