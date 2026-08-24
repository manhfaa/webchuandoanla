package vn.agromind.app.feature.garden.presentation

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
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.FarmPlotWriteDto
import javax.inject.Inject

private val GROWTH_STAGES = listOf("Cây con", "Sinh trưởng", "Ra hoa", "Đậu quả", "Thu hoạch")

data class PlotFormUiState(
    val name: String = "",
    val cropType: String = "",
    val areaValue: String = "",
    val areaUnit: String = "m2",
    val addressText: String = "",
    val growthStage: String = "",
    val nameError: String? = null,
    val areaError: String? = null,
    val formError: String? = null,
    val submitting: Boolean = false,
    val saved: Boolean = false,
) {
    val canSubmit: Boolean get() = name.isNotBlank() && cropType.isNotBlank() && !submitting
}

@HiltViewModel
class PlotFormViewModel @Inject constructor(
    private val api: FarmApi,
) : ViewModel() {

    private val _state = MutableStateFlow(PlotFormUiState())
    val state: StateFlow<PlotFormUiState> = _state.asStateFlow()

    fun onName(value: String) = _state.update { it.copy(name = value, nameError = null) }
    fun onCropType(value: String) = _state.update { it.copy(cropType = value) }
    fun onArea(value: String) = _state.update { it.copy(areaValue = value, areaError = null) }
    fun onUnit(value: String) = _state.update { it.copy(areaUnit = value) }
    fun onAddress(value: String) = _state.update { it.copy(addressText = value) }
    fun onStage(value: String) = _state.update { it.copy(growthStage = value) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return

        // Validated before the request so the grower gets the answer immediately
        // and the field that is wrong is the one that shows the error.
        val area = current.areaValue.replace(',', '.').trim()
        if (area.isNotBlank() && (area.toDoubleOrNull() == null || area.toDouble() <= 0)) {
            _state.update { it.copy(areaError = "Diện tích phải là số lớn hơn 0.") }
            return
        }

        _state.update { it.copy(submitting = true, formError = null) }
        viewModelScope.launch {
            val body = FarmPlotWriteDto(
                name = current.name.trim(),
                cropType = current.cropType.trim(),
                areaValue = area.takeIf { it.isNotBlank() },
                areaUnit = current.areaUnit,
                addressText = current.addressText.trim(),
                growthStage = current.growthStage,
            )
            when (val result = ErrorMapper.guard { api.createPlot(body) }) {
                is AgroResult.Ok -> _state.update { it.copy(submitting = false, saved = true) }
                is AgroResult.Err -> {
                    val fields = (result.error as? AgroError.Validation)?.fields.orEmpty()
                    _state.update {
                        it.copy(
                            submitting = false,
                            nameError = fields["name"],
                            areaError = fields["area_value"] ?: fields["area_unit"],
                            formError = result.error.message.takeIf { _ -> fields.isEmpty() },
                        )
                    }
                }
            }
        }
    }
}

/**
 * Thêm lô vườn.
 *
 * The area unit is a segmented choice rather than a text field because the
 * server accepts exactly four values — `m2`, `ha`, `sào`, `công`. Two of those
 * are regional units with no SI equivalent the app should be guessing at, and a
 * free-text field would produce "sao", "cong" and "công " and fail validation
 * for reasons the grower cannot see.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PlotFormScreen(
    onSaved: () -> Unit,
    onCancel: () -> Unit,
    viewModel: PlotFormViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    LaunchedEffect(ui.saved) { if (ui.saved) onSaved() }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Thêm lô vườn", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        OutlinedTextField(
            value = ui.name,
            onValueChange = viewModel::onName,
            label = { Text("Tên lô") },
            singleLine = true,
            isError = ui.nameError != null,
            supportingText = ui.nameError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = ui.cropType,
            onValueChange = viewModel::onCropType,
            label = { Text("Cây trồng") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = ui.areaValue,
            onValueChange = viewModel::onArea,
            label = { Text("Diện tích") },
            singleLine = true,
            isError = ui.areaError != null,
            supportingText = ui.areaError?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            AREA_UNITS.forEach { unit ->
                FilterChip(
                    selected = ui.areaUnit == unit,
                    onClick = { viewModel.onUnit(unit) },
                    label = { Text(unit, style = AgroTheme.typography.label) },
                    shape = AgroTheme.shapes.chip,
                    modifier = Modifier.heightIn(min = 46.dp),
                )
            }
        }

        OutlinedTextField(
            value = ui.addressText,
            onValueChange = viewModel::onAddress,
            label = { Text("Vị trí (xã, huyện)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Giai đoạn", style = AgroTheme.typography.label, color = colors.leafStrong)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            modifier = Modifier.fillMaxWidth(),
        ) {
            GROWTH_STAGES.forEach { stage ->
                FilterChip(
                    selected = ui.growthStage == stage,
                    onClick = { viewModel.onStage(if (ui.growthStage == stage) "" else stage) },
                    label = { Text(stage, style = AgroTheme.typography.label) },
                    shape = AgroTheme.shapes.chip,
                    modifier = Modifier.heightIn(min = 46.dp),
                )
            }
        }

        ui.formError?.let {
            Text(it, style = AgroTheme.typography.body, color = colors.danger)
        }

        PrimaryButton(
            label = "Lưu lô vườn",
            loadingLabel = "Đang lưu…",
            loading = ui.submitting,
            enabled = ui.canSubmit,
            onClick = viewModel::submit,
        )
        SecondaryButton(label = "Huỷ", onClick = onCancel)
    }
}
