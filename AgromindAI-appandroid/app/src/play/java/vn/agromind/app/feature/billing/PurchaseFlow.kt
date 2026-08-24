package vn.agromind.app.feature.billing

import androidx.compose.runtime.Composable
import vn.agromind.app.feature.billing.presentation.PlayBillingScreen

/**
 * The purchase entry point for the **play** distribution.
 *
 * Google Play Billing only. There is deliberately no fallback to a bank
 * transfer: for the digital features these plans unlock, Play policy requires
 * Play Billing, and the SePay screen is not even compiled into this artifact.
 */
@Composable
fun PurchaseFlow(
    planSlug: String,
    onDone: () -> Unit,
    onBack: () -> Unit,
) {
    PlayBillingScreen(planSlug = planSlug, onDone = onDone, onBack = onBack)
}
