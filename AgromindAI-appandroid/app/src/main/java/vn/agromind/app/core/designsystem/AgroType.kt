package vn.agromind.app.core.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Type scale from `design/DESIGN-TOKENS.md`.
 *
 * Sizes are in sp and no style pins a line height in dp, because the grower this
 * is built for often runs the system font at 130-200%. A screen that looks tidy
 * at 100% and clips at 200% is a screen that fails the person who most needed
 * the larger text.
 *
 * Body never goes below 15sp: the app is read outdoors, in sunlight, at arm's
 * length, sometimes through a dirty screen protector.
 *
 * The design calls for Be Vietnam Pro bundled in the app. Until the licensed
 * font files are added to `res/font/`, everything falls back to the platform
 * default — which is a legible Vietnamese-capable face, so the app is honest
 * rather than broken while that asset is pending.
 */
@Immutable
data class AgroTypography(
    val display: TextStyle,
    val screenTitle: TextStyle,
    val sectionTitle: TextStyle,
    val body: TextStyle,
    val bodyStrong: TextStyle,
    val label: TextStyle,
    val confidence: TextStyle,
    val mono: TextStyle,
)

private val Sans = FontFamily.Default

val AgromindTypography = AgroTypography(
    display = TextStyle(
        fontFamily = Sans,
        fontSize = 30.sp,
        fontWeight = FontWeight.ExtraBold,
        lineHeight = 34.sp,
        letterSpacing = (-0.02).em,
    ),
    screenTitle = TextStyle(
        fontFamily = Sans,
        fontSize = 25.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 31.sp,
        letterSpacing = (-0.015).em,
    ),
    sectionTitle = TextStyle(
        fontFamily = Sans,
        fontSize = 19.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 25.sp,
    ),
    body = TextStyle(
        fontFamily = Sans,
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 25.sp,
    ),
    bodyStrong = TextStyle(
        fontFamily = Sans,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 23.sp,
    ),
    label = TextStyle(
        fontFamily = Sans,
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 18.sp,
    ),
    // Never dimmed and never scaled down: this number is the reason the grower
    // opened the screen.
    confidence = TextStyle(
        fontFamily = Sans,
        fontSize = 36.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 36.sp,
    ),
    // Transfer reference, order code, source timestamp — things that get copied
    // character by character, where 0/O and 1/l must not be guessable.
    mono = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = 19.sp,
    ),
)

val LocalAgroTypography = staticCompositionLocalOf { AgromindTypography }
