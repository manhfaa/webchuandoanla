package vn.agromind.app.core.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire shapes for `/api/payments/`.
 *
 * The app never decides that a plan is active. It reads what the server says and
 * renders it; the only thing that activates a plan is the SePay webhook (or, for
 * the Play build, a purchase the server verified with Google). A "chúc mừng"
 * screen shown before that is a promise the app cannot keep.
 */

@Serializable
data class BankDetailsDto(
    val name: String = "",
    val code: String = "",
    /**
     * The virtual account when the bank needs one.
     *
     * This is the only number a transfer can go to and still be seen by the
     * gateway — money sent to the master account arrives at the bank but never
     * reaches SePay, so the webhook never fires and the plan never activates.
     * The screen shows exactly this number, never a "nicer" one.
     */
    @SerialName("account_number") val accountNumber: String = "",
    @SerialName("account_name") val accountName: String = "",
)

@Serializable
data class OrderSummaryDto(
    val id: String = "",
    val plan: String = "",
    val price: Long = 0,
    @SerialName("amount_received") val amountReceived: Long = 0,
    @SerialName("remaining_amount") val remainingAmount: Long = 0,
    val status: String = "pending",
    /** The transfer reference. Typed by hand into a banking app — never reworded. */
    @SerialName("transfer_content") val transferContent: String = "",
    @SerialName("expires_at") val expiresAt: String = "",
)

@Serializable
data class PaymentOrderDto(
    val id: String = "",
    @SerialName("payment_code") val paymentCode: String = "",
    val plan: String = "",
    @SerialName("plan_name") val planName: String = "",
    @SerialName("amount_expected") val amountExpected: Long = 0,
    @SerialName("amount_received") val amountReceived: Long = 0,
    @SerialName("remaining_amount") val remainingAmount: Long = 0,
    val currency: String = "VND",
    val status: String = "pending",
    @SerialName("needs_reconciliation") val needsReconciliation: Boolean = false,
    @SerialName("expires_at") val expiresAt: String = "",
    @SerialName("paid_at") val paidAt: String? = null,
)

/** `POST /api/payments/orders/` — the order plus everything the QR screen needs. */
@Serializable
data class CreateOrderRequest(val plan: String)

@Serializable
data class CreateOrderResponseDto(
    val created: Boolean = false,
    val order: OrderSummaryDto = OrderSummaryDto(),
    val bank: BankDetailsDto = BankDetailsDto(),
    /** Built by the server. The app renders it and never assembles a bank URL itself. */
    @SerialName("qr_url") val qrUrl: String = "",
    val status: String = "pending",
    @SerialName("needs_reconciliation") val needsReconciliation: Boolean = false,
)

/** `GET /api/payments/orders/{uuid}/`. */
@Serializable
data class OrderDetailDto(
    val order: PaymentOrderDto = PaymentOrderDto(),
    val bank: BankDetailsDto? = null,
    @SerialName("qr_url") val qrUrl: String = "",
    @SerialName("current_plan") val currentPlan: String = "seed",
    @SerialName("plan_expires_at") val planExpiresAt: String? = null,
)

@Serializable
data class ReconcileRequest(val note: String = "")

@Serializable
data class SubscriptionSummaryDto(
    @SerialName("current_plan") val currentPlan: String = "seed",
    @SerialName("plan_expires_at") val planExpiresAt: String? = null,
)

/* ------------------------------------------------------- Google Play --- */

/**
 * What the app sends after Play reports a purchase.
 *
 * Note what is *not* here: no plan slug the client chose, no price, no
 * entitlement. The server takes the purchase token to Google, asks what was
 * actually bought, and grants from that answer. Anything the client asserted
 * would be unverifiable — and a client that could name its own plan could name
 * "elite".
 */
@Serializable
data class PlayVerifyRequest(
    @SerialName("purchase_token") val purchaseToken: String,
    @SerialName("product_id") val productId: String,
    @SerialName("package_name") val packageName: String,
    @SerialName("client_request_id") val clientRequestId: String,
)

@Serializable
data class PlayVerifyResponseDto(
    val status: String = "",
    val plan: String = "",
    @SerialName("plan_expires_at") val planExpiresAt: String? = null,
    val acknowledged: Boolean = false,
)

@Serializable
data class PlayProductDto(
    val plan: String = "",
    @SerialName("product_id") val productId: String = "",
    @SerialName("base_plan_id") val basePlanId: String = "",
)
