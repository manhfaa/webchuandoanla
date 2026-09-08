package vn.agromind.app.feature.auth.presentation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton

/**
 * Đăng nhập.
 *
 * Layout notes that are requirements rather than taste:
 *
 * * The form is capped at 480dp and centred, so on a tablet the fields do not
 *   stretch to a line length nobody can track.
 * * `imePadding` plus a scroll container: at 200% font with the keyboard open
 *   there is no screen tall enough to hold this without scrolling.
 * * The show/hide password control is a full 48dp target. It is used with one
 *   thumb, outdoors, often to check a password typed wrong the first time.
 */
@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onRegister: () -> Unit,
    onForgotPassword: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.signedIn) {
        if (state.signedIn) onSignedIn()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding(),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 480.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = AgroSpacing.gutterCompact, vertical = AgroSpacing.xl),
            verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
        ) {
            Text(
                "Chào bạn quay lại",
                style = AgroTheme.typography.screenTitle,
                color = AgroTheme.colors.inkPrimary,
            )
            Text(
                "Đăng nhập để xem lại vườn và các lần kiểm tra lá.",
                style = AgroTheme.typography.body,
                color = AgroTheme.colors.inkSecondary,
            )

            Spacer(Modifier.height(AgroSpacing.sm))

            OutlinedTextField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                label = { Text("Email") },
                singleLine = true,
                isError = state.emailError != null,
                supportingText = state.emailError?.let { { Text(it) } },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = { Text("Mật khẩu") },
                singleLine = true,
                isError = state.passwordError != null,
                supportingText = state.passwordError?.let { { Text(it) } },
                visualTransformation = if (state.passwordVisible) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { viewModel.submit() }),
                trailingIcon = {
                    IconButton(
                        onClick = viewModel::togglePasswordVisible,
                        modifier = Modifier.height(AgroSpacing.minTouch),
                    ) {
                        Icon(
                            imageVector = if (state.passwordVisible) {
                                Icons.Outlined.VisibilityOff
                            } else {
                                Icons.Outlined.Visibility
                            },
                            contentDescription = if (state.passwordVisible) {
                                "Ẩn mật khẩu"
                            } else {
                                "Hiện mật khẩu"
                            },
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )

            TextButton(onClick = onForgotPassword, modifier = Modifier.align(Alignment.End)) {
                Text("Quên mật khẩu?", style = AgroTheme.typography.label)
            }

            state.formError?.let {
                Text(it, style = AgroTheme.typography.body, color = AgroTheme.colors.danger)
            }

            PrimaryButton(
                label = "Đăng nhập",
                loadingLabel = "Đang đăng nhập…",
                loading = state.submitting,
                enabled = state.canSubmit,
                onClick = viewModel::submit,
            )

            Spacer(Modifier.height(AgroSpacing.xs))

            TextButton(
                onClick = onRegister,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            ) {
                Text("Chưa có tài khoản? Đăng ký", style = AgroTheme.typography.bodyStrong)
            }
        }
    }

}
