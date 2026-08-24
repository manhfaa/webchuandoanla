package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.feature.auth.data.AuthRepository
import javax.inject.Inject

data class ForgotPasswordUiState(
    val email: String = "",
    val submitting: Boolean = false,
    val error: String? = null,
    /** Set once the server has answered. Null means nothing has been claimed yet. */
    val sentTo: String? = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state: StateFlow<ForgotPasswordUiState> = _state.asStateFlow()

    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }

    fun submit() {
        val email = _state.value.email.trim()
        if (email.isBlank() || _state.value.submitting) return

        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            when (val result = auth.requestPasswordReset(email)) {
                is AgroResult.Ok -> _state.update {
                    it.copy(
                        submitting = false,
                        // Only claimed when the server confirms it can actually
                        // send. See the screen comment.
                        sentTo = if (result.value.deliveryEnabled) email else null,
                        error = if (result.value.deliveryEnabled) null else DELIVERY_OFF,
                    )
                }
                is AgroResult.Err -> _state.update {
                    it.copy(submitting = false, error = result.error.message)
                }
            }
        }
    }

    private companion object {
        const val DELIVERY_OFF = "delivery_disabled"
    }
}

/**
 * Quên mật khẩu.
 *
 * The rule this screen exists to keep: **never say an email was sent when the
 * deployment cannot send one.** Some deployments have no mail provider
 * configured, and Django reports that as `delivery_enabled=false`. A grower told
 * "kiểm tra hộp thư" who then waits for a message that will never arrive is
 * worse off than one told plainly to contact support — they lose a day and the
 * trust with it.
 *
 * So the confirmation is rendered only on `delivery_enabled=true`, and the
 * false case gets its own block with a real way forward.
 */
@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    supportUrl: String,
    onOpenSupport: (String) -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors
    val deliveryOff = state.error == "delivery_disabled"

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.xl)
            .widthIn(max = 480.dp),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Đặt lại mật khẩu", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        when {
            deliveryOff -> {
                Text(
                    "Hệ thống gửi email chưa được bật",
                    style = AgroTheme.typography.sectionTitle,
                    color = colors.inkPrimary,
                )
                Text(
                    "Vườn của bạn vẫn an toàn. Hiện mình chưa gửi được thư đặt lại, " +
                        "nên bạn liên hệ hỗ trợ để được đổi mật khẩu giúp.",
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                Spacer(Modifier.height(AgroSpacing.xs))
                if (supportUrl.isNotBlank()) {
                    PrimaryButton(label = "Liên hệ hỗ trợ", onClick = { onOpenSupport(supportUrl) })
                }
                SecondaryButton(label = "Quay lại đăng nhập", onClick = onBack)
            }

            state.sentTo != null -> {
                Text(
                    "Mình đã gửi hướng dẫn tới ${state.sentTo}",
                    style = AgroTheme.typography.body,
                    color = colors.inkPrimary,
                )
                Text(
                    "Bạn mở thư và bấm vào liên kết trong đó là đặt lại được mật khẩu. " +
                        "Nếu chưa thấy thư, bạn xem thêm ở mục spam giúp mình nhé.",
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                Spacer(Modifier.height(AgroSpacing.xs))
                SecondaryButton(label = "Quay lại đăng nhập", onClick = onBack)
            }

            else -> {
                Text(
                    "Nhập email bạn đã dùng để đăng ký. Mình sẽ gửi hướng dẫn đặt lại mật khẩu.",
                    style = AgroTheme.typography.body,
                    color = colors.inkSecondary,
                )
                OutlinedTextField(
                    value = state.email,
                    onValueChange = viewModel::onEmailChange,
                    label = { Text("Email") },
                    singleLine = true,
                    isError = state.error != null,
                    supportingText = state.error?.takeIf { !deliveryOff }?.let { { Text(it) } },
                    modifier = Modifier.fillMaxWidth(),
                )
                PrimaryButton(
                    label = "Gửi hướng dẫn đặt lại",
                    loadingLabel = "Đang gửi…",
                    loading = state.submitting,
                    enabled = state.email.isNotBlank(),
                    onClick = viewModel::submit,
                )
                TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text("Quay lại đăng nhập", style = AgroTheme.typography.bodyStrong)
                }
            }
        }
    }
}
