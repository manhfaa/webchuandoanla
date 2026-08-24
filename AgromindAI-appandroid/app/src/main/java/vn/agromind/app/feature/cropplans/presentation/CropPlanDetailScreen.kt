package vn.agromind.app.feature.cropplans.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
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
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.CropPlanApi
import vn.agromind.app.core.network.dto.CropPlanDetailDto
import vn.agromind.app.core.network.dto.CropPlanStepDto
import vn.agromind.app.core.network.dto.StepDelayRequest
import javax.inject.Inject

/** Which slice of the plan the tabs show. */
enum class StepFilter(val label: String) { Today("Hôm nay"), Overdue("Quá hạn"), Upcoming("Sắp tới"), Done("Đã xong") }

data class PlanDetailUiState(
    val loading: Boolean = true,
    val plan: CropPlanDetailDto? = null,
    val filter: StepFilter = StepFilter.Today,
    val error: AgroError? = null,
    val busyStepId: Int? = null,
)

@HiltViewModel
class CropPlanDetailViewModel @Inject constructor(
    private val api: CropPlanApi,
    savedState: SavedStateHandle,
) : ViewModel() {

    private val planId: Int = savedState.get<String>("id")?.toIntOrNull() ?: -1

    private val _state = MutableStateFlow(PlanDetailUiState())
    val state: StateFlow<PlanDetailUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (planId <= 0) {
            _state.value = PlanDetailUiState(loading = false, error = AgroError.NotFound("Không tìm thấy kế hoạch."))
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { api.plan(planId) }) {
                is AgroResult.Ok -> _state.update { it.copy(loading = false, plan = result.value) }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }

    fun setFilter(filter: StepFilter) = _state.update { it.copy(filter = filter) }

    fun complete(step: CropPlanStepDto) = act(step) { api.completeStep(step.id) }
    fun reopen(step: CropPlanStepDto) = act(step) { api.reopenStep(step.id) }
    fun delay(step: CropPlanStepDto, days: Int) =
        act(step) { api.delayStep(step.id, StepDelayRequest(delayDays = days)) }

    private fun act(step: CropPlanStepDto, call: suspend () -> CropPlanStepDto) {
        if (_state.value.busyStepId != null) return
        _state.update { it.copy(busyStepId = step.id) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { call() }) {
                is AgroResult.Ok -> _state.update { s ->
                    // The server's copy of the step replaces the local one: it
                    // recomputes the schedule when a step is delayed, so keeping
                    // the old dates would show a plan that no longer exists.
                    s.copy(
                        busyStepId = null,
                        plan = s.plan?.copy(
                            steps = s.plan.steps.map { if (it.id == step.id) result.value else it },
                        ),
                    )
                }
                is AgroResult.Err -> _state.update { it.copy(busyStepId = null, error = result.error) }
            }
        }
    }
}

/**
 * Tiến độ kế hoạch.
 *
 * Overdue is its own tab rather than a red badge in a long list. A grower who
 * missed two waterings needs to see exactly those two, not scroll a
 * thirty-step plan hunting for red.
 *
 * "Hoãn 3 ngày" is a first-class action beside "Đánh dấu xong", because the real
 * alternative to a step happening on time is it happening late — and a plan that
 * only offers "done" gets abandoned the first week it rains.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CropPlanDetailScreen(
    todayIso: String,
    onBack: () -> Unit,
    viewModel: CropPlanDetailViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.error != null && ui.plan == null) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa mở được kế hoạch",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    val plan = ui.plan ?: return
    val steps = plan.steps.filter { step ->
        val day = step.suggestedStartTime.take(10)
        when (ui.filter) {
            StepFilter.Today -> step.status != "completed" && day == todayIso
            StepFilter.Overdue -> step.status != "completed" && day.isNotBlank() && day < todayIso
            StepFilter.Upcoming -> step.status != "completed" && day > todayIso
            StepFilter.Done -> step.status == "completed"
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text(plan.title, style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
        if (plan.summary.isNotBlank()) {
            Text(plan.summary, style = AgroTheme.typography.body, color = colors.inkSecondary)
        }

        FlowRow(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            StepFilter.entries.forEach { filter ->
                val count = plan.steps.count { step ->
                    val day = step.suggestedStartTime.take(10)
                    when (filter) {
                        StepFilter.Today -> step.status != "completed" && day == todayIso
                        StepFilter.Overdue -> step.status != "completed" && day.isNotBlank() && day < todayIso
                        StepFilter.Upcoming -> step.status != "completed" && day > todayIso
                        StepFilter.Done -> step.status == "completed"
                    }
                }
                FilterChip(
                    selected = ui.filter == filter,
                    onClick = { viewModel.setFilter(filter) },
                    label = { Text("${filter.label} ($count)", style = AgroTheme.typography.label) },
                    shape = AgroTheme.shapes.chip,
                    modifier = Modifier.heightIn(min = 46.dp),
                )
            }
        }

        if (steps.isEmpty()) {
            Text(
                when (ui.filter) {
                    StepFilter.Today -> "Hôm nay không có việc nào trong kế hoạch này."
                    StepFilter.Overdue -> "Không có việc nào quá hạn. Tốt lắm."
                    StepFilter.Upcoming -> "Chưa có việc nào sắp tới."
                    StepFilter.Done -> "Chưa có bước nào được đánh dấu xong."
                },
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        steps.forEach { step ->
            val overdue = step.status != "completed" &&
                step.suggestedStartTime.take(10).let { it.isNotBlank() && it < todayIso }

            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.surface)
                    .border(
                        1.dp,
                        if (overdue) colors.danger.copy(alpha = 0.5f) else colors.divider,
                        AgroTheme.shapes.card,
                    )
                    .padding(AgroSpacing.md)
                    .semantics(mergeDescendants = true) {
                        contentDescription = buildString {
                            if (overdue) append("Quá hạn. ")
                            append("Bước ${step.stepNumber}: ${step.title}. ${step.description}")
                        }
                    },
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    step.suggestedStartTime.take(10).ifBlank { "Chưa đặt ngày" },
                    style = AgroTheme.typography.label,
                    color = if (overdue) colors.danger else colors.leafStrong,
                )
                Text(step.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                if (step.description.isNotBlank()) {
                    Text(step.description, style = AgroTheme.typography.body, color = colors.inkSecondary)
                }
                step.riskNotes.forEach {
                    Text("⚠ $it", style = AgroTheme.typography.label, color = colors.sun)
                }
                if (step.delayReason.isNotBlank()) {
                    Text(
                        "Đã hoãn: ${step.delayReason}",
                        style = AgroTheme.typography.label,
                        color = colors.inkSecondary,
                    )
                }

                FlowRow(horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                    if (step.status == "completed") {
                        AssistChip(
                            onClick = { viewModel.reopen(step) },
                            label = { Text("Mở lại", style = AgroTheme.typography.label) },
                            modifier = Modifier.heightIn(min = 46.dp),
                        )
                    } else {
                        AssistChip(
                            onClick = { viewModel.complete(step) },
                            label = { Text("Đánh dấu xong", style = AgroTheme.typography.label) },
                            modifier = Modifier.heightIn(min = 46.dp),
                        )
                        AssistChip(
                            onClick = { viewModel.delay(step, 3) },
                            label = { Text("Hoãn 3 ngày", style = AgroTheme.typography.label) },
                            modifier = Modifier.heightIn(min = 46.dp),
                        )
                    }
                }
            }
        }
    }
}
