package vn.agromind.app.core.designsystem

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/**
 * Motion tokens from `design/MOTION-SPEC.md`.
 *
 * Three movements exist in this product and no others: the scan passes over the
 * photo once, the leaf markers appear and stop, the confidence bar fills once.
 * Nothing loops. An app that is read in a garden with a 3% battery and a weak
 * signal has no business animating forever, and a shimmer that never settles
 * reads as "still loading" long after the data arrived.
 */
object AgroMotion {
    /** Screen transition. */
    const val ScreenMs = 220

    /** A control changing state (pressed, selected, expanded). */
    const val StateMs = 150

    /** The single scan pass over a captured leaf photo. */
    const val ScanMs = 1900

    /** The confidence bar filling, once, when it first becomes visible. */
    const val ConfidenceMs = 900

    /** Gap between leaf markers appearing. At most three markers. */
    const val MarkerStaggerMs = 160

    val Standard: Easing = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f)
    val Emphasized: Easing = CubicBezierEasing(0.2f, 0.9f, 0.3f, 1f)

    /** How far a screen slides in. Small: this is a hint, not a journey. */
    val ScreenTranslation = 10.dp
}

/**
 * Whether the grower has asked the system for less movement.
 *
 * Every animation in the app must check this. "Giảm chuyển động" is also a
 * setting inside the app, and the two are OR-ed: the app may reduce motion the
 * system did not ask to reduce, never the other way round.
 */
@Composable
@ReadOnlyComposable
fun systemReducesMotion(): Boolean {
    val resolver = LocalContext.current.contentResolver
    val scale = android.provider.Settings.Global.getFloat(
        resolver,
        android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
        1f,
    )
    return scale == 0f
}
