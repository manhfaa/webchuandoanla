package vn.agromind.app.core.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

/** What the grower chose in Hồ sơ → Giao diện. */
enum class ThemePreference { System, Light, Dark }

/** Whether the app is reducing motion, from the in-app setting. */
val LocalReduceMotion: ProvidableCompositionLocal<Boolean> = staticCompositionLocalOf { false }

/**
 * The one theme. Wraps `MaterialTheme` rather than replacing it, because stock
 * Material components (text fields, bottom sheets, ripples) still need a scheme
 * to read — and if that scheme were left at the default, a `TextField` would sit
 * on the ivory canvas with a purple cursor.
 *
 * Screens should read `AgroTheme.colors` / `AgroTheme.typography`. The Material
 * scheme below is a translation of the same tokens, not a second palette.
 */
@Composable
fun AgromindTheme(
    preference: ThemePreference = ThemePreference.System,
    reduceMotion: Boolean = false,
    content: @Composable () -> Unit,
) {
    val dark = when (preference) {
        ThemePreference.System -> isSystemInDarkTheme()
        ThemePreference.Light -> false
        ThemePreference.Dark -> true
    }
    val colors = if (dark) DarkAgroColors else LightAgroColors

    val scheme = if (dark) {
        darkColorScheme(
            primary = colors.leaf,
            onPrimary = colors.canvas,
            primaryContainer = colors.softLeaf,
            onPrimaryContainer = colors.inkPrimary,
            secondary = colors.leafStrong,
            onSecondary = colors.canvas,
            background = colors.canvas,
            onBackground = colors.inkPrimary,
            surface = colors.surface,
            onSurface = colors.inkPrimary,
            surfaceVariant = colors.softLeaf,
            onSurfaceVariant = colors.inkSecondary,
            surfaceContainerHigh = colors.raised,
            outline = colors.inkSecondary,
            outlineVariant = colors.divider,
            error = colors.danger,
            onError = colors.canvas,
        )
    } else {
        lightColorScheme(
            primary = colors.leaf,
            onPrimary = colors.raised,
            primaryContainer = colors.softLeaf,
            onPrimaryContainer = colors.leafStrong,
            secondary = colors.leafStrong,
            onSecondary = colors.raised,
            background = colors.canvas,
            onBackground = colors.inkPrimary,
            surface = colors.surface,
            onSurface = colors.inkPrimary,
            surfaceVariant = colors.softLeaf,
            onSurfaceVariant = colors.inkSecondary,
            surfaceContainerHigh = colors.raised,
            outline = colors.inkSecondary,
            outlineVariant = colors.divider,
            error = colors.danger,
            onError = colors.raised,
        )
    }

    CompositionLocalProvider(
        LocalAgroColors provides colors,
        LocalAgroTypography provides AgromindTypography,
        LocalAgroShapes provides AgroShapes(),
        LocalReduceMotion provides reduceMotion,
    ) {
        MaterialTheme(
            colorScheme = scheme,
            typography = materialTypography(),
            shapes = androidx.compose.material3.Shapes(
                small = AgroShapes().chip,
                medium = AgroShapes().card,
                large = AgroShapes().cardLarge,
            ),
            content = content,
        )
    }
}

/** Material's slots, filled from the Agromind scale so stock widgets match. */
private fun materialTypography(): Typography {
    val t = AgromindTypography
    return Typography(
        displaySmall = t.display,
        headlineMedium = t.screenTitle,
        headlineSmall = t.sectionTitle,
        titleLarge = t.sectionTitle,
        titleMedium = t.bodyStrong,
        bodyLarge = t.body,
        bodyMedium = t.body,
        labelLarge = t.label,
        labelMedium = t.label,
        labelSmall = t.label,
    )
}

object AgroTheme {
    val colors: AgroColors
        @Composable @ReadOnlyComposable get() = LocalAgroColors.current

    val typography: AgroTypography
        @Composable @ReadOnlyComposable get() = LocalAgroTypography.current

    val shapes: AgroShapes
        @Composable @ReadOnlyComposable get() = LocalAgroShapes.current

    /** True when either the system or the in-app setting asks for less motion. */
    val reduceMotion: Boolean
        @Composable @ReadOnlyComposable get() = LocalReduceMotion.current || systemReducesMotion()
}
