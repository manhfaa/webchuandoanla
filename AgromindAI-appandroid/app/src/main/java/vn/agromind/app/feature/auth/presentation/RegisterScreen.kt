package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
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
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.feature.auth.data.AuthRepository
import javax.inject.Inject

/** Three bars, not a score out of 100. See [PasswordStrength.of]. */
enum class PasswordStrength(val bars: Int, val hint: String) {
    TooShort(0, "Mật khẩu cần ít nhất 8 ký tự."),
    Weak(1, "Thêm chữ hoa hoặc số sẽ chắc hơn."),
    Fair(2, "Đủ dùng. Thêm một số hoặc dấu câu sẽ tốt hơn."),
    Strong(3, "Đủ mạnh.");

    companion object {
        /**
         * Deliberately crude, and deliberately not a percentage.
         *
         * A real strength estimate needs a dictionary and an attack model, and
         * Django enforces the actual policy on submit anyway. What this is for is
         * telling a grower whether to keep typing — three bars and one sentence
         * does that; "67% strong" does not.
         */
        fun of(password: String): PasswordStrength {
            if (password.length < 8) return TooShort
            var classes = 0
            if (password.any { it.isLowerCase() }) classes++
            if (password.any { it.isUpperCase() }) classes++
            if (password.any { it.isDigit() }) classes++
            if (password.any { !it.isLetterOrDigit() }) classes++
            return when {
                classes >= 3 && password.length >= 10 -> Strong
                classes >= 2 -> Fair
                else -> Weak
            }
        }
    }
}

data class RegisterUiState(
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val acceptedTerms: Boolean = false,
    val emailError: String? = null,
    val passwordError: String? = null,
    val formError: String? = null,
    val submitting: Boolean = false,
    val signedIn: Boolean = false,
) {
    val strength: PasswordStrength get() = PasswordStrength.of(password)

    /**
     * The terms checkbox gates the button rather than being validated on submit.
     *
     * `accepted_terms` is what Django records as consent, and consent has to be
     * a deliberate act — a form that submits and then complains is a form that
     * teaches people to tick without reading.
     */
    val canSubmit: Boolean
        get() = email.isNotBlank() && password.isNotBlank() && acceptedTerms && !submitting
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterUiState())
    val state: StateFlow<RegisterUiState> = _state.asStateFlow()

    fun onFullNameChange(value: String) = _state.update { it.copy(fullName = value, formError = null) }
    fun onEmailChange(value: String) = _state.update { it.copy(email = value, emailError = null, formError = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, passwordError = null, formError = null) }
    fun onTermsChange(value: Boolean) = _state.update { it.copy(acceptedTerms = value) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return

        _state.update { it.copy(submitting = true, formError = null) }
        viewModelScope.launch {
            when (
                val result = auth.register(
                    email = current.email,
                    password = current.password,
                    fullName = current.fullName,
                    acceptedTerms = true,
                )
            ) {
                is AgroResult.Ok -> _state.update { it.copy(submitting = false, signedIn = true) }
                is AgroResult.Err -> {
                    val fields = (result.error as? AgroError.Validation)?.fields.orEmpty()
                    _state.update {
                        it.copy(
                            submitting = false,
                            emailError = fields["email"],
                            passwordError = fields["password"],
                            formError = result.error.message.takeIf { _ -> fields.isEmpty() },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RegisterScreen(
    onRegistered: () -> Unit,
    onBack: () -> Unit,
    termsUrl: String,
    privacyUrl: String,
    onOpenLink: (String) -> Unit,
    viewModel: RegisterViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors

    LaunchedEffect(state.signedIn) {
        if (state.signedIn) onRegistered()
    }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.xl)
            .widthIn(max = 480.dp),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Tạo tài khoản", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)
        Text(
            "Tài khoản dùng để lưu lại các lần kiểm tra lá và nhật ký từng lô vườn.",
            style = AgroTheme.typography.body,
            color = colors.inkSecondary,
        )

        OutlinedTextField(
            value = state.fullName,
            onValueChange = viewModel::onFullNameChange,
            label = { Text("Họ và tên") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.email,
            onValueChange = viewModel::onEmailChange,
            label = { Text("Email") },
            singleLine = true,
            isError = state.emailError != null,
            supportingText = state.emailError?.let { { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.password,
            onValueChange = viewModel::onPasswordChange,
            label = { Text("Mật khẩu") },
            singleLine = true,
            isError = state.passwordError != null,
            supportingText = state.passwordError?.let { { Text(it) } },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )

        StrengthBars(state.strength)

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = state.acceptedTerms, onCheckedChange = viewModel::onTermsChange)
            Column(Modifier.weight(1f)) {
                Text(
                    "Mình đồng ý với điều khoản sử dụng và chính sách riêng tư.",
                    style = AgroTheme.typography.body,
                    color = colors.inkPrimary,
                )
                Row {
                    // Real links, not decorative text: consent to something the
                    // grower cannot read is not consent.
                    TextButton(onClick = { onOpenLink(termsUrl) }) {
                        Text("Điều khoản", style = AgroTheme.typography.label, color = colors.info)
                    }
                    TextButton(onClick = { onOpenLink(privacyUrl) }) {
                        Text("Riêng tư", style = AgroTheme.typography.label, color = colors.info)
                    }
                }
            }
        }

        state.formError?.let {
            Text(it, style = AgroTheme.typography.body, color = colors.danger)
        }

        PrimaryButton(
            label = "Tạo tài khoản",
            loadingLabel = "Đang tạo tài khoản…",
            loading = state.submitting,
            enabled = state.canSubmit,
            onClick = viewModel::submit,
        )

        TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Đã có tài khoản? Đăng nhập", style = AgroTheme.typography.bodyStrong)
        }

        Spacer(Modifier.height(AgroSpacing.lg))
    }
}

@Composable
private fun StrengthBars(strength: PasswordStrength) {
    val colors = AgroTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
            repeat(3) { index ->
                Box(
                    Modifier
                        .weight(1f)
                        .height(4.dp)
                        .background(
                            if (index < strength.bars) {
                                when (strength) {
                                    PasswordStrength.Strong -> colors.leaf
                                    PasswordStrength.Fair -> colors.sun
                                    else -> colors.danger
                                }
                            } else {
                                colors.divider
                            },
                        ),
                )
            }
        }
        Text(strength.hint, style = AgroTheme.typography.label, color = colors.inkSecondary)
    }
}
