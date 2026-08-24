package vn.agromind.app.feature.billing

import androidx.compose.runtime.Composable
import vn.agromind.app.feature.billing.presentation.SepayCheckoutScreen

/**
 * The purchase entry point for the **direct** distribution.
 *
 * There is a function with this exact signature in each flavour's source set and
 * none in `main`, so the compiler picks one per variant and the other never
 * exists in the artifact. That is what keeps a bank-transfer screen out of the
 * Play build at the level of what is compiled, rather than at the level of a
 * runtime `if` somebody could get wrong.
 */
@Composable
fun PurchaseFlow(
    planSlug: String,
    onDone: () -> Unit,
    onBack: () -> Unit,
) {
    SepayCheckoutScreen(onDone = onDone, onBack = onBack)
}
