package vn.agromind.app.feature.auth.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.feature.auth.data.AuthRepository
import javax.inject.Inject

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val passwordVisible: Boolean = false,
    val emailError: String? = null,
    val passwordError: String? = null,
    val formError: String? = null,
    val submitting: Boolean = false,
    val signedIn: Boolean = false,
) {
    val canSubmit: Boolean get() = email.isNotBlank() && password.isNotBlank() && !submitting
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(value: String) = _state.update {
        it.copy(email = value, emailError = null, formError = null)
    }

    fun onPasswordChange(value: String) = _state.update {
        it.copy(password = value, passwordError = null, formError = null)
    }

    fun togglePasswordVisible() = _state.update { it.copy(passwordVisible = !it.passwordVisible) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return

        // Validated here, not on every keystroke: telling someone their email is
        // malformed while they are still typing it is noise.
        if (!EMAIL.matches(current.email.trim())) {
            _state.update {
                it.copy(emailError = "Email chưa đúng định dạng. Bạn kiểm tra lại giúp mình nhé.")
            }
            return
        }

        _state.update { it.copy(submitting = true, formError = null) }

        viewModelScope.launch {
            when (val result = auth.login(current.email, current.password)) {
                is AgroResult.Ok -> _state.update { it.copy(submitting = false, signedIn = true) }
                is AgroResult.Err -> _state.update { it.applyError(result.error) }
            }
        }
    }

    private fun LoginUiState.applyError(error: AgroError): LoginUiState {
        val fields = (error as? AgroError.Validation)?.fields.orEmpty()
        return copy(
            submitting = false,
            emailError = fields["email"],
            passwordError = fields["password"],
            // Only shown when the error does not belong to a field, so the
            // message never appears twice on the same screen.
            formError = error.message.takeIf { fields.isEmpty() },
        )
    }

    private companion object {
        val EMAIL = Regex("^[^@\\s]+@[^@\\s.]+(\\.[^@\\s.]+)+$")
    }
}
