package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
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
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.network.dto.DeletionPreviewDto
import vn.agromind.app.feature.auth.data.AuthRepository
import vn.agromind.app.feature.diagnosis.data.ImagePreprocessor
import javax.inject.Inject

data class SecurityFormState(
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val hasUsablePassword: Boolean = true,
    val busy: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class ChangePasswordViewModel @Inject constructor(private val auth: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(SecurityFormState())
    val state: StateFlow<SecurityFormState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            (auth.me() as? AgroResult.Ok)?.let { account ->
                _state.update { it.copy(hasUsablePassword = account.value.hasUsablePassword) }
            }
        }
    }

    fun current(value: String) = _state.update { it.copy(currentPassword = value, error = null) }
    fun password(value: String) = _state.update { it.copy(newPassword = value, error = null) }
    fun confirm(value: String) = _state.update { it.copy(confirmPassword = value, error = null) }

    fun submit() {
        val s = _state.value
        val error = when {
            s.newPassword.length < 8 -> "Mật khẩu mới cần ít nhất 8 ký tự."
            s.newPassword != s.confirmPassword -> "Hai lần nhập mật khẩu mới chưa trùng nhau."
            else -> null
        }
        if (error != null) {
            _state.update { it.copy(error = error) }
            return
        }
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            when (val result = auth.changePassword(s.currentPassword.takeIf { s.hasUsablePassword }, s.newPassword)) {
                is AgroResult.Ok -> _state.update { it.copy(busy = false, done = true) }
                is AgroResult.Err -> _state.update { it.copy(busy = false, error = result.error.message) }
            }
        }
    }
}

@Composable
fun ChangePasswordScreen(onBack: () -> Unit, viewModel: ChangePasswordViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    if (state.done) onBack()
    SecurityForm(
        title = if (state.hasUsablePassword) "Đổi mật khẩu" else "Tạo mật khẩu đăng nhập",
        state = state,
        onCurrent = viewModel::current,
        onPassword = viewModel::password,
        onConfirm = viewModel::confirm,
        onSubmit = viewModel::submit,
        onBack = onBack,
    )
}

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val auth: AuthRepository,
) : ViewModel() {
    private val token: String = savedStateHandle.get<String>("token").orEmpty()
    private val _state = MutableStateFlow(SecurityFormState(hasUsablePassword = false))
    val state: StateFlow<SecurityFormState> = _state.asStateFlow()
    fun password(value: String) = _state.update { it.copy(newPassword = value, error = null) }
    fun confirm(value: String) = _state.update { it.copy(confirmPassword = value, error = null) }
    fun submit() {
        val s = _state.value
        if (s.newPassword.length < 8 || s.newPassword != s.confirmPassword) {
            _state.update { it.copy(error = "Mật khẩu cần ít nhất 8 ký tự và hai lần nhập phải trùng nhau.") }
            return
        }
        _state.update { it.copy(busy = true) }
        viewModelScope.launch {
            when (val result = auth.confirmPasswordReset(token, s.newPassword)) {
                is AgroResult.Ok -> _state.update { it.copy(busy = false, done = true) }
                is AgroResult.Err -> _state.update { it.copy(busy = false, error = result.error.message) }
            }
        }
    }
}

@Composable
fun ResetPasswordScreen(onBack: () -> Unit, viewModel: ResetPasswordViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    SecurityForm(
        title = if (state.done) "Đã đặt lại mật khẩu" else "Đặt mật khẩu mới",
        state = state,
        onCurrent = {},
        onPassword = viewModel::password,
        onConfirm = viewModel::confirm,
        onSubmit = viewModel::submit,
        onBack = onBack,
    )
}

@Composable
private fun SecurityForm(
    title: String,
    state: SecurityFormState,
    onCurrent: (String) -> Unit,
    onPassword: (String) -> Unit,
    onConfirm: (String) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        TextButton(onClick = onBack) { Text("Quay lại") }
        Text(title, style = AgroTheme.typography.screenTitle, color = AgroTheme.colors.inkPrimary)
        if (!state.done) {
            if (state.hasUsablePassword) PasswordField("Mật khẩu hiện tại", state.currentPassword, onCurrent)
            PasswordField("Mật khẩu mới", state.newPassword, onPassword)
            PasswordField("Nhập lại mật khẩu mới", state.confirmPassword, onConfirm)
            state.error?.let { Text(it, color = AgroTheme.colors.danger) }
            PrimaryButton("Lưu mật khẩu", onSubmit, loading = state.busy, enabled = !state.busy)
        } else {
            Text("Mật khẩu đã được cập nhật. Bạn có thể tiếp tục sử dụng ứng dụng.")
            PrimaryButton("Tiếp tục", onBack)
        }
    }
}

@Composable
private fun PasswordField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}

data class DeleteAccountState(
    val preview: DeletionPreviewDto? = null,
    val password: String = "",
    val confirmation: String = "",
    val hasUsablePassword: Boolean = true,
    val loading: Boolean = true,
    val deleting: Boolean = false,
    val error: String? = null,
    val deleted: Boolean = false,
)

@HiltViewModel
class DeleteAccountViewModel @Inject constructor(
    private val auth: AuthRepository,
    private val cache: OfflineCache,
    private val images: ImagePreprocessor,
) : ViewModel() {
    private val _state = MutableStateFlow(DeleteAccountState())
    val state: StateFlow<DeleteAccountState> = _state.asStateFlow()
    init {
        viewModelScope.launch {
            val me = auth.me()
            val preview = auth.deletionPreview()
            _state.update {
                it.copy(
                    loading = false,
                    hasUsablePassword = (me as? AgroResult.Ok)?.value?.hasUsablePassword ?: true,
                    preview = (preview as? AgroResult.Ok)?.value,
                    error = (preview as? AgroResult.Err)?.error?.message,
                )
            }
        }
    }
    fun password(value: String) = _state.update { it.copy(password = value, error = null) }
    fun confirmation(value: String) = _state.update { it.copy(confirmation = value, error = null) }
    fun delete() {
        val s = _state.value
        if (s.confirmation.trim().uppercase() != s.preview?.confirmationPhrase.orEmpty()) {
            _state.update { it.copy(error = "Bạn cần nhập đúng cụm xác nhận được hiển thị.") }
            return
        }
        _state.update { it.copy(deleting = true) }
        viewModelScope.launch {
            when (val result = auth.deleteAccount(s.password.takeIf { s.hasUsablePassword }, s.confirmation)) {
                is AgroResult.Ok -> {
                    cache.clearPersonal()
                    images.clearCache()
                    _state.update { it.copy(deleting = false, deleted = true) }
                }
                is AgroResult.Err -> _state.update { it.copy(deleting = false, error = result.error.message) }
            }
        }
    }
}

@Composable
fun DeleteAccountScreen(onBack: () -> Unit, viewModel: DeleteAccountViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        TextButton(onClick = onBack) { Text("Quay lại") }
        Text("Xoá tài khoản", style = AgroTheme.typography.screenTitle, color = AgroTheme.colors.danger)
        val p = state.preview
        if (p != null) {
            Text("Thao tác này xoá vĩnh viễn ${p.diagnoses} lần kiểm tra, ${p.farmPlots} lô vườn và ${p.cropPlans} kế hoạch.")
            if (state.hasUsablePassword) PasswordField("Mật khẩu", state.password, viewModel::password)
            OutlinedTextField(
                value = state.confirmation,
                onValueChange = viewModel::confirmation,
                label = { Text("Nhập ${p.confirmationPhrase}") },
                modifier = Modifier.fillMaxWidth(),
            )
            state.error?.let { Text(it, color = AgroTheme.colors.danger) }
            PrimaryButton("Xoá vĩnh viễn", viewModel::delete, loading = state.deleting, enabled = !state.deleting)
        } else if (!state.loading) {
            Text(state.error ?: "Chưa tải được thông tin cần xoá.", color = AgroTheme.colors.danger)
        }
    }
}
