package vn.agromind.app.feature.weather.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.FarmApi
import vn.agromind.app.core.network.dto.FarmAdvisoryDto
import vn.agromind.app.core.network.dto.FarmLocationDto
import vn.agromind.app.core.network.dto.WeatherDto
import javax.inject.Inject

data class WeatherUiState(
    val loading: Boolean = true,
    val location: FarmLocationDto? = null,
    val weather: WeatherDto? = null,
    val advisory: FarmAdvisoryDto? = null,
    val error: AgroError? = null,
    /** No saved location has coordinates yet. Not an error — a setup step. */
    val needsLocation: Boolean = false,
)

@HiltViewModel
class WeatherViewModel @Inject constructor(
    private val api: FarmApi,
) : ViewModel() {

    private val _state = MutableStateFlow(WeatherUiState())
    val state: StateFlow<WeatherUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val locations = ErrorMapper.guard { api.locations() }
            if (locations is AgroResult.Err) {
                _state.update { it.copy(loading = false, error = locations.error) }
                return@launch
            }

            // The default location first, then any location that actually has
            // coordinates. A location with only a name cannot be forecast for.
            val location = locations.valueOrNull.orEmpty()
                .firstOrNull { it.isDefault && it.latitude != null && it.longitude != null }
                ?: locations.valueOrNull.orEmpty()
                    .firstOrNull { it.latitude != null && it.longitude != null }

            if (location?.latitude == null || location.longitude == null) {
                _state.value = WeatherUiState(loading = false, needsLocation = true)
                return@launch
            }

            val weather = ErrorMapper.guard { api.weather(location.latitude, location.longitude) }
            val advisory = ErrorMapper.guard { api.advisory(locationId = location.id, crop = location.cropType.takeIf { it.isNotBlank() }) }

            _state.value = WeatherUiState(
                loading = false,
                location = location,
                weather = weather.valueOrNull,
                advisory = advisory.valueOrNull,
                error = (weather as? AgroResult.Err)?.error,
            )
        }
    }
}

/**
 * Thời tiết & cảnh báo.
 *
 * The screen always says how old the numbers are. Weather that looks live but
 * was fetched yesterday will get a grower to spray before rain, and the app has
 * no way to know it is stale unless it prints the timestamp it was given.
 *
 * `is_current == false` means Open-Meteo omitted the live block and the server
 * fell back to today's aggregate — whose wind is the day's *maximum*. Labelling
 * that "hiện tại" would overstate it, so the copy changes instead.
 */
@Composable
fun WeatherScreen(
    onBack: () -> Unit,
    onAddLocation: () -> Unit,
    viewModel: WeatherViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.needsLocation) {
        StateBlock(
            art = StateArt.Contour,
            title = "Vườn của bạn ở đâu?",
            body = "Mình cần biết vị trí để lấy thời tiết và cảnh báo sâu bệnh. Bạn thêm một lô vườn " +
                "có địa chỉ giúp mình nhé.",
            primary = StateAction("Thêm lô vườn", onAddLocation),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    if (ui.error != null && ui.weather == null) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa lấy được thời tiết",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    val weather = ui.weather ?: return

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.section),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(AgroTheme.shapes.cardLarge)
                .background(colors.forest)
                .padding(AgroSpacing.lg)
                .semantics(mergeDescendants = true) {
                    contentDescription = "${weather.current.temperatureC} độ, ${weather.current.summary}, " +
                        "độ ẩm ${weather.current.humidityPercent} phần trăm"
                },
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
        ) {
            Text(
                ui.location?.name.orEmpty().ifBlank { "Vườn của bạn" },
                style = AgroTheme.typography.label,
                color = colors.mint,
            )
            Text(
                "${weather.current.temperatureC}°",
                style = AgroTheme.typography.display,
                color = colors.onForest,
            )
            Text(weather.current.summary, style = AgroTheme.typography.body, color = colors.mint)

            Row(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.md)) {
                MiniStat("Độ ẩm", "${weather.current.humidityPercent}%")
                MiniStat("Khả năng mưa", "${weather.current.rainProbabilityPercent}%")
                MiniStat("Gió", "${weather.current.windKmh} km/h")
            }

            Text(
                text = buildString {
                    append(if (weather.current.isCurrent) "số liệu hiện tại" else "số liệu trung bình trong ngày")
                    append(" · cập nhật ")
                    append(weather.fetchedAt.substringAfter('T').take(5).ifBlank { "—" })
                    if (weather.timezone.isNotBlank()) append(" · ${weather.timezone}")
                    append(" · nguồn ${weather.source}")
                },
                style = AgroTheme.typography.mono,
                color = colors.mint,
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            Text("7 ngày tới", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
            weather.forecast7d.forEach { day ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(AgroTheme.shapes.card)
                        .background(colors.surface)
                        .border(1.dp, colors.divider, AgroTheme.shapes.card)
                        .padding(AgroSpacing.sm)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "${day.date}: ${day.summary}, " +
                                "${day.temperatureMinC ?: day.temperatureC} đến ${day.temperatureMaxC ?: day.temperatureC} độ, " +
                                "khả năng mưa ${day.rainProbabilityPercent} phần trăm"
                        },
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(day.date, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                        Text(day.summary, style = AgroTheme.typography.label, color = colors.inkSecondary)
                    }
                    Text(
                        "${day.temperatureMinC ?: day.temperatureC}° – ${day.temperatureMaxC ?: day.temperatureC}°",
                        style = AgroTheme.typography.bodyStrong,
                        color = colors.inkPrimary,
                    )
                    Spacer(Modifier.size(AgroSpacing.xs))
                    Text(
                        "${day.rainProbabilityPercent}%",
                        style = AgroTheme.typography.label,
                        color = colors.info,
                    )
                }
            }
        }

        ui.advisory?.let { advisory ->
            if (advisory.pestAlerts.isNotEmpty() || advisory.warnings.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    Text("Cảnh báo", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
                    advisory.warnings.forEach {
                        Text("• $it", style = AgroTheme.typography.body, color = colors.inkSecondary)
                    }
                    advisory.pestAlerts.forEach { alert -> AlertCard(alert.title, alert.severity, alert.description, alert.recommendation) }
                }
            }

            if (advisory.disclaimer.isNotBlank()) {
                Text(advisory.disclaimer, style = AgroTheme.typography.mono, color = colors.inkSecondary)
            }
        }

        SecondaryButton(label = "Làm mới", onClick = viewModel::refresh)
    }
}

@Composable
private fun MiniStat(label: String, value: String) {
    val colors = AgroTheme.colors
    Column {
        Text(label, style = AgroTheme.typography.label, color = colors.mint)
        Text(value, style = AgroTheme.typography.bodyStrong, color = colors.onForest)
    }
}

/**
 * Severity always carries a word, never only a colour.
 *
 * A yellow card and an orange card are indistinguishable to a red/green
 * colour-blind reader in sunlight, and this is the screen that tells someone
 * whether to act today.
 */
@Composable
private fun AlertCard(title: String, severity: String, description: String, recommendation: String) {
    val colors = AgroTheme.colors
    val (label, accent) = when (severity.lowercase()) {
        "high", "danger", "urgent" -> "CẦN XỬ LÝ SỚM" to colors.danger
        "medium", "watch", "warning" -> "CẦN THEO DÕI" to colors.sun
        else -> "BÌNH THƯỜNG" to colors.leaf
    }

    Column(
        Modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .padding(AgroSpacing.md)
            .semantics(mergeDescendants = true) {
                contentDescription = "$label. $title. $description"
            },
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(label, style = AgroTheme.typography.label, color = accent)
        Text(title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
        if (description.isNotBlank()) {
            Text(description, style = AgroTheme.typography.body, color = colors.inkSecondary)
        }
        if (recommendation.isNotBlank()) {
            Text(recommendation, style = AgroTheme.typography.body, color = colors.leafStrong)
        }
    }
}
