package vn.agromind.app.feature.billing.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import vn.agromind.app.BuildConfig
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.ChatApi
import vn.agromind.app.core.network.api.DiagnosisApi
import vn.agromind.app.core.network.dto.ServicePlanDto
import vn.agromind.app.core.network.dto.UsageDto
import javax.inject.Inject

data class PlansUiState(
    val loading: Boolean = true,
    val plans: List<ServicePlanDto> = emptyList(),
    val usage: UsageDto? = null,
    val error: AgroError? = null,
)

@HiltViewModel
class PlansViewModel @Inject constructor(
    private val chatApi: ChatApi,
    private val diagnosisApi: DiagnosisApi,
) : ViewModel() {

    private val _state = MutableStateFlow(PlansUiState())
    val state: StateFlow<PlansUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = PlansUiState(loading = true)
        viewModelScope.launch {
            val plans = ErrorMapper.guard { chatApi.plans() }
            val usage = ErrorMapper.guard { diagnosisApi.usage() }
            _state.value = PlansUiState(
                loading = false,
                plans = plans.valueOrNull.orEmpty(),
                usage = usage.valueOrNull,
                error = (plans as? AgroResult.Err)?.error,
            )
        }
    }
}

/**
 * Gói dịch vụ.
 *
 * Every price, every benefit and every cap on this screen comes from
 * `/api/engagement/plans/` and `/api/diagnoses/usage/`. Nothing is re-typed
 * here: a promotion changed in the database has to change what the app says, or
 * the app is advertising terms the server will not honour.
 *
 * The purchase CTA is the part that carries policy weight:
 *
 * * In the **play** build, Google requires Play Billing for these digital
 *   features. Until the server can verify a Play purchase
 *   (`GOOGLE_PLAY_BILLING_ENABLED`), the CTA says so and there is **no** path to
 *   a bank transfer anywhere in this build — offering one would be the
 *   violation, not the workaround.
 * * In the **direct** build the existing SePay order flow applies.
 */
@Composable
fun PlansScreen(
    contentPadding: PaddingValues,
    canPurchase: Boolean,
    onStartPurchase: (String) -> Unit,
    viewModel: PlansViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    if (ui.error != null && ui.plans.isEmpty()) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa tải được bảng giá",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::load),
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
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Gói dịch vụ", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        ui.usage?.let { usage ->
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.cardLarge)
                    .background(colors.forest)
                    .padding(AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("ĐANG DÙNG", style = AgroTheme.typography.label, color = colors.mint)
                Text(usage.planName, style = AgroTheme.typography.sectionTitle, color = colors.onForest)
                Text(
                    "Kiểm tra ảnh hôm nay: ${usage.dailyDiagnoses.remaining ?: "không giới hạn"}",
                    style = AgroTheme.typography.body,
                    color = colors.mint,
                )
            }
        }

        if (!canPurchase) {
            // Named plainly instead of a disabled button with no explanation.
            Text(
                text = if (BuildConfig.PLAY_BILLING_ENABLED) {
                    "Thanh toán trên Google Play đang được hoàn thiện. Bạn xem trước quyền lợi các gói ở đây nhé."
                } else {
                    "Thanh toán chưa được bật trên máy chủ. Bạn liên hệ hỗ trợ để nâng cấp giúp mình nhé."
                },
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        ui.plans.forEach { plan ->
            val isCurrent = plan.slug == ui.usage?.plan
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(AgroTheme.shapes.card)
                    .background(colors.surface)
                    .border(
                        width = if (isCurrent) 2.dp else 1.dp,
                        color = if (isCurrent) colors.leaf else colors.divider,
                        shape = AgroTheme.shapes.card,
                    )
                    .padding(AgroSpacing.md),
                verticalArrangement = Arrangement.spacedBy(AgroSpacing.xxs),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(plan.name, style = AgroTheme.typography.sectionTitle, color = colors.inkPrimary)
                    if (isCurrent) {
                        Text("Đang dùng", style = AgroTheme.typography.label, color = colors.leafStrong)
                    }
                }
                Text(
                    "${plan.priceMonthly} ${plan.currency} · ${plan.subscriptionDays} ngày",
                    style = AgroTheme.typography.bodyStrong,
                    color = colors.inkPrimary,
                )
                if (plan.description.isNotBlank()) {
                    Text(plan.description, style = AgroTheme.typography.body, color = colors.inkSecondary)
                }
                if (canPurchase && !isCurrent) {
                    SecondaryButton(
                        label = if (BuildConfig.PLAY_BILLING_ENABLED) "Mua trên Google Play" else "Chuyển khoản",
                        onClick = { onStartPurchase(plan.slug) },
                    )
                }
            }
        }
    }
}
