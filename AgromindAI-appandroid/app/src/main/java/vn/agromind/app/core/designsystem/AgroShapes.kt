package vn.agromind.app.core.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.dp

/**
 * Radii and the 4dp spacing grid from `design/DESIGN-TOKENS.md`.
 *
 * [leafLens] is the one deliberately irregular shape in the product: 20/40/20/40
 * reads as organic rather than as a rounded rectangle, which is what separates
 * "a photo of a leaf" from "a photo in a card". It is reserved for the diagnosis
 * flow and the result screen; using it as decoration elsewhere would spend the
 * one distinctive form the design has.
 */
@Immutable
data class AgroShapes(
    val button: RoundedCornerShape = RoundedCornerShape(12.dp),
    val chip: RoundedCornerShape = RoundedCornerShape(10.dp),
    val card: RoundedCornerShape = RoundedCornerShape(16.dp),
    val cardLarge: RoundedCornerShape = RoundedCornerShape(22.dp),
    val sheet: RoundedCornerShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
    val leafLens: RoundedCornerShape = RoundedCornerShape(
        topStart = 20.dp,
        topEnd = 40.dp,
        bottomEnd = 20.dp,
        bottomStart = 40.dp,
    ),
)

/** The 4dp grid. Named so a screen reads as intent, not as arithmetic. */
object AgroSpacing {
    val xxs = 4.dp
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 20.dp
    val xl = 26.dp
    val xxl = 32.dp

    /** Screen gutter. Widens with the window so text lines stay readable. */
    val gutterCompact = 20.dp
    val gutterMedium = 28.dp
    val gutterExpanded = 32.dp

    /** Between two sections of a screen. */
    val section = 26.dp

    /**
     * Smallest touch target anywhere in the app, and the height a primary
     * button starts at. Both are above the platform minimum on purpose: this is
     * used one-handed, standing up, sometimes with wet hands.
     */
    val minTouch = 48.dp
    val primaryButtonHeight = 54.dp
}

val LocalAgroShapes = staticCompositionLocalOf { AgroShapes() }
