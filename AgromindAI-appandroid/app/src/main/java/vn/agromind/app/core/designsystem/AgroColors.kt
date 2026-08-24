package vn.agromind.app.core.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * The palette from `design/DESIGN-TOKENS.md`, as semantic tokens.
 *
 * Feature screens read these names — `canvas`, `sun`, `danger` — and never a hex
 * value. That is what makes the dark theme a different set of values rather than
 * a second implementation, and it is why "vàng = cần theo dõi" stays true
 * everywhere instead of only where someone remembered.
 *
 * Material 3's own scheme is derived from these in [AgromindTheme] so that
 * stock components (text fields, sheets, ripples) land in the same world as the
 * custom ones, but Agromind screens should reach for `AgroTheme.colors`.
 */
@Immutable
data class AgroColors(
    val canvas: Color,
    val surface: Color,
    val raised: Color,
    val softLeaf: Color,
    val inkPrimary: Color,
    val inkSecondary: Color,
    val divider: Color,
    val forest: Color,
    val leaf: Color,
    val leafStrong: Color,
    val mint: Color,
    val sun: Color,
    val soil: Color,
    val danger: Color,
    val info: Color,
    val isDark: Boolean,
) {
    /** Text/icon colour that stays legible on [forest]. */
    val onForest: Color get() = if (isDark) inkPrimary else Color(0xFFEAF4EC)
}

val LightAgroColors = AgroColors(
    canvas = Color(0xFFF7F5EE),
    surface = Color(0xFFFFFEFA),
    raised = Color(0xFFFFFFFF),
    softLeaf = Color(0xFFEAF4EC),
    inkPrimary = Color(0xFF13251A),
    inkSecondary = Color(0xFF5C6D62),
    divider = Color(0xFFDCE8DD),
    forest = Color(0xFF0B2B1D),
    leaf = Color(0xFF238554),
    leafStrong = Color(0xFF17683F),
    mint = Color(0xFFBFE8CD),
    sun = Color(0xFFD89A28),
    soil = Color(0xFF77563C),
    danger = Color(0xFFC9513E),
    info = Color(0xFF2F6FA9),
    isDark = false,
)

/**
 * Not an inversion of the light set.
 *
 * Depth in the dark theme comes from stepping the surface (canvas → surface →
 * raised → softLeaf) and from a faint light border, never from a black shadow —
 * a shadow on a near-black canvas is invisible, so elevation drawn that way
 * simply disappears. The accent colours are lightened separately so body text
 * still clears 4.5:1 against them.
 */
val DarkAgroColors = AgroColors(
    canvas = Color(0xFF07170F),
    surface = Color(0xFF0D2418),
    raised = Color(0xFF123321),
    softLeaf = Color(0xFF173C29),
    inkPrimary = Color(0xFFF2F8F3),
    inkSecondary = Color(0xFFB5C8BA),
    divider = Color(0x24D5F5DF),
    forest = Color(0xFF0B2B1D),
    leaf = Color(0xFF55C982),
    leafStrong = Color(0xFF3FB870),
    mint = Color(0xFFBFE8CD),
    sun = Color(0xFFF2C45B),
    soil = Color(0xFFA98263),
    danger = Color(0xFFF07A63),
    info = Color(0xFF7FB4E0),
    isDark = true,
)

val LocalAgroColors = staticCompositionLocalOf { LightAgroColors }
