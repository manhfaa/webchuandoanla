package vn.agromind.app.feature.cropplans.presentation

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
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
import vn.agromind.app.core.network.api.CropPlanApi
import vn.agromind.app.core.network.dto.CropPlanListItemDto
import vn.agromind.app.core.network.dto.ReminderDto
import vn.agromind.app.core.reminders.ReminderScheduler
import javax.inject.Inject

data class CropPlanListUiState(
    val loading: Boolean = true,
    val plans: List<CropPlanListItemDto> = emptyList(),
    val reminders: List<ReminderDto> = emptyList(),
    val cached: Boolean = false,
    val error: AgroError? = null,
)

@HiltViewModel
class CropPlanListViewModel @Inject constructor(
    private val api: CropPlanApi,
    private val cache: OfflineCache,
) : ViewModel() {

    private val _state = MutableStateFlow(CropPlanListUiState())
    val state: StateFlow<CropPlanListUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val cachedPlans = cache.plans().orEmpty()
            val cachedReminders = cache.reminders().orEmpty()
            if (cachedPlans.isNotEmpty() || cachedReminders.isNotEmpty()) {
                _state.value = CropPlanListUiState(
                    loading = true,
                    plans = cachedPlans,
                    reminders = cachedReminders,
                    cached = true,
                )
            }
            val plans = ErrorMapper.guard { api.plans() }
            val reminders = ErrorMapper.guard { api.reminders(filter = "today") }
            plans.valueOrNull?.results?.let { cache.savePlans(it) }
            reminders.valueOrNull?.results?.let { cache.saveReminders(it) }
            _state.value = CropPlanListUiState(
                loading = false,
                plans = plans.valueOrNull?.results ?: cachedPlans,
                reminders = reminders.valueOrNull?.results ?: cachedReminders,
                cached = plans is AgroResult.Err,
                error = (plans as? AgroResult.Err)?.error.takeIf { cachedPlans.isEmpty() },
            )
        }
    }

    fun markRead(reminder: ReminderDto) {
        viewModelScope.launch {
            ErrorMapper.guard { api.markReminderRead(reminder.id) }
            _state.update { s -> s.copy(reminders = s.reminders.filterNot { it.id == reminder.id }) }
        }
    }
}

/**
 * Kế hoạch trồng.
 *
 * Today's reminders come first, above the plans themselves. A grower opening
 * this screen in the morning is asking "hôm nay tôi phải làm gì", not "cho tôi
 * xem danh sách kế hoạch" — and a reminder that has to be found by drilling into
 * a plan is a reminder that gets missed.
 */
@Composable
fun CropPlanListScreen(
    onOpenPlan: (Int) -> Unit,
    onCreate: () -> Unit,
    onBack: () -> Unit,
    viewModel: CropPlanListViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors
    val context = LocalContext.current
    var notificationsGranted by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED,
        )
    }
    val notificationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        notificationsGranted = granted
        if (granted) ReminderScheduler.refreshNow(context)
    }

    if (ui.error != null && ui.plans.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa tải được kế hoạch",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::refresh),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    if (!ui.loading && ui.plans.isEmpty()) {
        StateBlock(
            art = StateArt.LeafLens,
            title = "Chưa có kế hoạch nào",
            body = "Chọn một loại cây và ngày bắt đầu, mình sẽ dựng lịch chăm sóc theo từng bước cho bạn.",
            primary = StateAction("Tạo kế hoạch", onCreate),
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.section),
    ) {
        if (ui.cached) {
            Text("Dữ liệu đã lưu trên máy", style = AgroTheme.typography.label, color = colors.inkSecondary)
        }
        if (!notificationsGranted) {
            Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                Text(
                    "Bật thông báo để không bỏ lỡ việc chăm sóc đến hạn.",
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                SecondaryButton(
                    label = "Bật nhắc việc trên điện thoại",
                    onClick = { notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS) },
                )
            }
        }
        if (ui.reminders.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
                Text("Việc hôm nay", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
                ui.reminders.forEach { reminder ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(AgroTheme.shapes.card)
                            .background(colors.softLeaf)
                            .padding(AgroSpacing.md)
                            .clickable { viewModel.markRead(reminder) }
                            .heightIn(min = AgroSpacing.minTouch)
                            .semantics(mergeDescendants = true) {
                                contentDescription = "${reminder.title}. ${reminder.body}. Chạm để đánh dấu đã đọc."
                            },
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(reminder.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                        Text(reminder.body, style = AgroTheme.typography.body, color = colors.inkSecondary)
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            Text("Kế hoạch của bạn", style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)

            ui.plans.forEach { plan ->
                val done = plan.completedStepCount
                val total = plan.stepCount.coerceAtLeast(1)
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(AgroTheme.shapes.card)
                        .background(colors.surface)
                        .border(1.dp, colors.divider, AgroTheme.shapes.card)
                        .clickable { onOpenPlan(plan.id) }
                        .padding(AgroSpacing.md)
                        .semantics(mergeDescendants = true) {
                            contentDescription = "${plan.title}, đã xong $done trên $total bước"
                        },
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(plan.title, style = AgroTheme.typography.bodyStrong, color = colors.inkPrimary)
                        Text(
                            "$done/$total",
                            style = AgroTheme.typography.bodyStrong,
                            color = colors.leafStrong,
                        )
                    }
                    plan.currentStep?.let {
                        Text(
                            "Bước tiếp theo: ${it.title}",
                            style = AgroTheme.typography.body,
                            color = colors.inkSecondary,
                        )
                    }
                    if (plan.summary.isNotBlank()) {
                        Text(plan.summary, style = AgroTheme.typography.label, color = colors.inkSecondary)
                    }
                }
            }
        }

        Spacer(Modifier.size(AgroSpacing.xxs))
        PrimaryButton(label = "Tạo kế hoạch mới", onClick = onCreate)
    }
}
