package vn.agromind.app.feature.billing.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.PaymentApi
import vn.agromind.app.core.network.dto.BankDetailsDto
import vn.agromind.app.core.network.dto.CreateOrderRequest
import vn.agromind.app.core.network.dto.ReconcileRequest
import javax.inject.Inject

data class CheckoutUiState(
    val loading: Boolean = true,
    val orderId: String = "",
    val status: String = "pending",
    val transferContent: String = "",
    val amount: Long = 0,
    val remaining: Long = 0,
    val bank: BankDetailsDto = BankDetailsDto(),
    val qrUrl: String = "",
    val secondsLeft: Long = 0,
    val needsReconciliation: Boolean = false,
    val error: AgroError? = null,
)

/**
 * Lives in the `direct` source set, not in `main`.
 *
 * That is the enforcement, not a convention: the Play artifact is compiled
 * without this file, so no code path, no deep link and no accidental merge can
 * surface a bank transfer inside a build distributed through Google Play.
 */
@HiltViewModel
class SepayCheckoutViewModel @Inject constructor(
    private val api: PaymentApi,
    savedState: SavedStateHandle,
) : ViewModel() {

    private val planSlug: String = savedState.get<String>("plan").orEmpty()

    private val _state = MutableStateFlow(CheckoutUiState())
    val state: StateFlow<CheckoutUiState> = _state.asStateFlow()

    init {
        start()
    }

    fun start() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val result = ErrorMapper.guard { api.createOrder(CreateOrderRequest(planSlug)) }) {
                is AgroResult.Ok -> {
                    val body = result.value
                    _state.value = CheckoutUiState(
                        loading = false,
                        orderId = body.order.id,
                        status = body.order.status,
                        transferContent = body.order.transferContent,
                        amount = body.order.price,
                        remaining = body.order.remainingAmount,
                        bank = body.bank,
                        qrUrl = body.qrUrl,
                        secondsLeft = secondsUntil(body.order.expiresAt),
                        needsReconciliation = body.needsReconciliation,
                    )
                    poll()
                    countdown()
                }
                is AgroResult.Err -> _state.update { it.copy(loading = false, error = result.error) }
            }
        }
    }

    /**
     * Polls while the screen is alive, and only while the order is still open.
     *
     * The interval widens the longer it takes: a transfer usually settles within
     * a minute, but someone who walked to a bank can be twenty minutes away, and
     * polling every five seconds for twenty minutes is a lot of radio time on a
     * phone that is out in a field.
     *
     * The app never decides the order is paid — it re-reads what the server says
     * after the SePay webhook has settled it.
     */
    private fun poll() {
        viewModelScope.launch {
            var attempt = 0
            while (isActive) {
                val interval = when {
                    attempt < 12 -> 5_000L
                    attempt < 30 -> 10_000L
                    else -> 20_000L
                }
                delay(interval)
                attempt++

                val id = _state.value.orderId
                if (id.isBlank()) return@launch

                val result = ErrorMapper.guard { api.order(id) }
                val detail = result.valueOrNull ?: continue
                _state.update {
                    it.copy(
                        status = detail.order.status,
                        remaining = detail.order.remainingAmount,
                        needsReconciliation = detail.order.needsReconciliation,
                    )
                }
                if (detail.order.status in TERMINAL) return@launch
            }
        }
    }

    private fun countdown() {
        viewModelScope.launch {
            while (isActive && _state.value.secondsLeft > 0) {
                delay(1_000)
                _state.update { it.copy(secondsLeft = (it.secondsLeft - 1).coerceAtLeast(0)) }
            }
        }
    }

    fun requestReconciliation() {
        val id = _state.value.orderId
        if (id.isBlank()) return
        viewModelScope.launch {
            ErrorMapper.guard { api.reconcile(id, ReconcileRequest("Yêu cầu từ ứng dụng Android")) }
            _state.update { it.copy(needsReconciliation = true) }
        }
    }

    private companion object {
        val TERMINAL = setOf("paid", "expired", "cancelled")

        /** Server time is authoritative; the device clock is not trusted for the TTL. */
        fun secondsUntil(iso: String): Long {
            return runCatching {
                val expires = java.time.Instant.parse(iso)
                java.time.Duration.between(java.time.Instant.now(), expires).seconds.coerceAtLeast(0)
            }.getOrDefault(0L)
        }
    }
}

/**
 * Chuyển khoản qua SePay.
 *
 * Nothing on this screen congratulates the grower before the server says `paid`.
 * The bank has the money before SePay does and SePay has it before Django does;
 * a "cảm ơn bạn đã nâng cấp" shown at transfer time would be wrong for the
 * minutes in between and permanently wrong if the transfer never matched.
 */
@Composable
fun SepayCheckoutScreen(
    onDone: () -> Unit,
    onBack: () -> Unit,
    viewModel: SepayCheckoutViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors
    val clipboard = LocalClipboardManager.current

    if (ui.error != null) {
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa tạo được đơn",
            body = ui.error!!.message,
            primary = StateAction("Thử lại", viewModel::start),
            secondary = StateAction("Quay lại", onBack),
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        val (title, cta) = when (ui.status) {
            "pending" -> "Đang chờ nhận tiền" to null
            "underpaid" -> "Còn thiếu ${ui.remaining.dong()}" to "Xem lại thông tin chuyển"
            "paid" -> "Đã nhận đủ, gói đã mở" to null
            "overpaid" -> "Bạn chuyển dư" to "Yêu cầu đối soát"
            "expired" -> "Đơn đã hết hạn" to "Tạo đơn mới"
            "cancelled" -> "Đơn đã huỷ" to null
            else -> "Đang đối soát thủ công" to "Xem tình trạng yêu cầu"
        }

        Text(title, style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        if (ui.status == "pending" || ui.status == "underpaid") {
            Text(
                text = "Đơn giữ trong ${ui.secondsLeft.clock()}",
                style = AgroTheme.typography.mono,
                color = colors.sun,
                // Announced at intervals, not every second: a countdown read
                // aloud 1800 times is unusable.
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )

            if (ui.qrUrl.isNotBlank()) {
                AsyncImage(
                    model = ui.qrUrl,
                    contentDescription = "Mã QR chuyển khoản",
                    modifier = Modifier
                        .size(176.dp)
                        .align(Alignment.CenterHorizontally)
                        .clip(AgroTheme.shapes.card),
                )
            }

            listOf(
                "Ngân hàng" to ui.bank.name,
                "Số tài khoản" to ui.bank.accountNumber,
                "Chủ tài khoản" to ui.bank.accountName,
                "Số tiền" to ui.amount.dong(),
                "Nội dung chuyển khoản" to ui.transferContent,
            ).forEach { (label, value) ->
                CopyRow(label, value) { clipboard.setText(AnnotatedString(value)) }
            }

            Text(
                "Ghi đúng nội dung chuyển khoản ở trên. Chuyển đúng số tiền, đừng làm tròn — " +
                    "hệ thống đối chiếu theo đúng nội dung và số tiền này.",
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        when (ui.status) {
            "paid" -> {
                Text(
                    "Máy chủ đã xác nhận thanh toán và mở gói cho bạn.",
                    style = AgroTheme.typography.body,
                    color = colors.leafStrong,
                )
                PrimaryButton(label = "Xong", onClick = onDone)
            }
            "expired", "cancelled" -> PrimaryButton(label = "Tạo đơn mới", onClick = viewModel::start)
            "overpaid", "review" -> {
                Text(
                    "Đơn này cần người đối soát vì số tiền không khớp. Mình đã ghi nhận và sẽ xử lý.",
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                if (!ui.needsReconciliation) {
                    PrimaryButton(label = "Yêu cầu đối soát", onClick = viewModel::requestReconciliation)
                }
            }
            else -> Text(
                "Sau khi bạn chuyển xong, mình tự kiểm tra và mở gói. Bạn không cần bấm gì thêm.",
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        Spacer(Modifier.size(AgroSpacing.xs))
        SecondaryButton(label = "Quay lại", onClick = onBack)
        cta?.let { /* the actions above already cover each state */ }
    }
}

@Composable
private fun CopyRow(label: String, value: String, onCopy: () -> Unit) {
    val colors = AgroTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(AgroTheme.shapes.card)
            .background(colors.surface)
            .border(1.dp, colors.divider, AgroTheme.shapes.card)
            .padding(AgroSpacing.sm)
            .heightIn(min = AgroSpacing.minTouch),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = AgroTheme.typography.label, color = colors.inkSecondary)
            Text(
                value,
                style = AgroTheme.typography.mono,
                color = colors.inkPrimary,
                // Read character by character. "AGM8F2K91" spoken as a word is
                // useless to someone typing it into a banking app.
                modifier = Modifier.semantics { contentDescription = value.toList().joinToString(" ") },
            )
        }
        TextButton(onClick = onCopy) {
            Text("Sao chép", style = AgroTheme.typography.label, color = colors.leafStrong)
        }
    }
}

private fun Long.dong(): String {
    val grouped = toString().reversed().chunked(3).joinToString(".").reversed()
    return "$grouped đ"
}

private fun Long.clock(): String = "%02d:%02d".format(this / 60, this % 60)
