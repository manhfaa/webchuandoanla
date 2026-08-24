package vn.agromind.app.feature.profile.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.database.OfflineCache
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.ThemePreference
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.network.dto.AccountDto
import vn.agromind.app.core.settings.LocalPreferences
import vn.agromind.app.feature.auth.data.AuthRepository
import vn.agromind.app.feature.diagnosis.data.ImagePreprocessor
import javax.inject.Inject

data class ProfileUiState(
    val account: AccountDto? = null,
    val theme: ThemePreference = ThemePreference.System,
    val reduceMotion: Boolean = false,
    val autoSaveDraft: Boolean = true,
    val signingOut: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val auth: AuthRepository,
    private val preferences: LocalPreferences,
    private val images: ImagePreprocessor,
    private val cache: OfflineCache,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val display = preferences.display.first()
            _state.update {
                it.copy(
                    theme = display.theme,
                    reduceMotion = display.reduceMotion,
                    autoSaveDraft = display.autoSaveSymptomDraft,
                )
            }
            (auth.me() as? AgroResult.Ok)?.let { result ->
                _state.update { it.copy(account = result.value) }
            }
        }
    }

    fun setTheme(preference: ThemePreference) {
        _state.update { it.copy(theme = preference) }
        viewModelScope.launch { preferences.setTheme(preference) }
    }

    fun setReduceMotion(enabled: Boolean) {
        _state.update { it.copy(reduceMotion = enabled) }
        viewModelScope.launch { preferences.setReduceMotion(enabled) }
    }

    fun setAutoSaveDraft(enabled: Boolean) {
        _state.update { it.copy(autoSaveDraft = enabled) }
        viewModelScope.launch { preferences.setAutoSaveSymptomDraft(enabled) }
    }

    /**
     * Signing out clears the device as well as the server session.
     *
     * The cached leaf photos go with it: they are the grower's crop, on a phone
     * that may now be handed to someone else, and no part of "đăng xuất" should
     * leave them readable.
     */
    fun signOut(onDone: () -> Unit) {
        _state.update { it.copy(signingOut = true) }
        viewModelScope.launch {
            auth.logout()
            images.clearCache()
            cache.clearPersonal()
            _state.update { it.copy(signingOut = false) }
            onDone()
        }
    }
}

/**
 * Hồ sơ & cài đặt.
 *
 * "Giảm chuyển động" exists here as well as in the system settings because a
 * grower who finds the scan animation distracting should not have to turn off
 * every animation on their phone to stop it. The two are OR-ed — the app may
 * reduce motion the system did not ask to reduce, never the reverse.
 */
@Composable
fun ProfileScreen(
    contentPadding: PaddingValues,
    onSignedOut: () -> Unit,
    onChangePassword: () -> Unit,
    onDeleteAccount: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val colors = AgroTheme.colors
    var confirmSignOut by remember { mutableStateOf(false) }

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
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.section),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(AgroTheme.shapes.card)
                .background(colors.surface)
                .border(1.dp, colors.divider, AgroTheme.shapes.card)
                .padding(AgroSpacing.md),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                ui.account?.fullName?.takeIf { it.isNotBlank() } ?: ui.account?.username.orEmpty(),
                style = AgroTheme.typography.sectionTitle,
                color = colors.inkPrimary,
            )
            Text(ui.account?.email.orEmpty(), style = AgroTheme.typography.body, color = colors.inkSecondary)
            ui.account?.currentPlan?.let {
                Text("Gói hiện tại: $it", style = AgroTheme.typography.label, color = colors.leafStrong)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            Text("HIỂN THỊ", style = AgroTheme.typography.label, color = colors.leafStrong)
            Row(
                Modifier.selectableGroup(),
                horizontalArrangement = Arrangement.spacedBy(AgroSpacing.xs),
            ) {
                listOf(
                    ThemePreference.System to "Theo hệ thống",
                    ThemePreference.Light to "Sáng",
                    ThemePreference.Dark to "Tối",
                ).forEach { (preference, label) ->
                    FilterChip(
                        selected = ui.theme == preference,
                        onClick = { viewModel.setTheme(preference) },
                        label = { Text(label, style = AgroTheme.typography.label) },
                        shape = AgroTheme.shapes.chip,
                    )
                }
            }

            ToggleRow(
                label = "Giảm chuyển động",
                hint = "Tắt hiệu ứng quét ảnh và thanh độ tin cậy chạy",
                checked = ui.reduceMotion,
                onChange = viewModel::setReduceMotion,
            )
            ToggleRow(
                label = "Tự lưu nháp mô tả",
                hint = "Giữ lại phần mô tả dấu hiệu nếu app bị đóng giữa chừng",
                checked = ui.autoSaveDraft,
                onChange = viewModel::setAutoSaveDraft,
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(AgroSpacing.xs)) {
            Text("BẢO MẬT", style = AgroTheme.typography.label, color = colors.leafStrong)
            SecondaryButton(
                label = if (ui.account?.hasUsablePassword == false) "Tạo mật khẩu đăng nhập" else "Đổi mật khẩu",
                onClick = onChangePassword,
            )
            SecondaryButton(label = "Đăng xuất", onClick = { confirmSignOut = true })
            TextButton(onClick = onDeleteAccount) {
                Text("Xoá tài khoản", style = AgroTheme.typography.bodyStrong, color = colors.danger)
            }
        }
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Đăng xuất khỏi thiết bị này?") },
            text = {
                Text(
                    "Ảnh đang lưu tạm trên máy sẽ được xoá. Các lần kiểm tra đã lưu vẫn còn " +
                        "trên tài khoản của bạn.",
                )
            },
            // The safe choice is the confirm button's neighbour and gets the
            // default focus; the destructive one is never the easy tap.
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) { Text("Ở lại") }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmSignOut = false
                        viewModel.signOut(onSignedOut)
                    },
                ) {
                    Text("Đăng xuất", color = AgroTheme.colors.danger)
                }
            },
        )
    }
}

@Composable
private fun ToggleRow(label: String, hint: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val colors = AgroTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = AgroSpacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = AgroTheme.typography.body, color = colors.inkPrimary)
            Text(hint, style = AgroTheme.typography.label, color = colors.inkSecondary)
        }
        Spacer(Modifier.size(AgroSpacing.xs))
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
