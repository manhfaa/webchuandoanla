package vn.agromind.app.feature.billing.presentation

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.agromind.app.core.common.AgroError
import vn.agromind.app.core.common.AgroResult
import vn.agromind.app.core.designsystem.AgroSpacing
import vn.agromind.app.core.designsystem.AgroTheme
import vn.agromind.app.core.designsystem.components.PrimaryButton
import vn.agromind.app.core.designsystem.components.SecondaryButton
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.network.ErrorMapper
import vn.agromind.app.core.network.api.PaymentApi
import vn.agromind.app.core.network.dto.PlayVerifyRequest
import java.util.UUID
import javax.inject.Inject

data class PlayBillingUiState(
    val connecting: Boolean = true,
    val productDetails: ProductDetails? = null,
    val priceLabel: String = "",
    val verifying: Boolean = false,
    val granted: Boolean = false,
    val error: AgroError? = null,
    val unavailableReason: String? = null,
)

@HiltViewModel
class PlayBillingViewModel @Inject constructor(
    @ApplicationContext private val context: android.content.Context,
    private val api: PaymentApi,
) : ViewModel() {

    private val _state = MutableStateFlow(PlayBillingUiState())
    val state: StateFlow<PlayBillingUiState> = _state.asStateFlow()

    private var billingClient: BillingClient? = null
    private var productId: String = ""

    private val purchasesListener = PurchasesUpdatedListener { result, purchases ->
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases.orEmpty().forEach { verify(it) }
            BillingClient.BillingResponseCode.USER_CANCELED ->
                _state.update { it.copy(verifying = false) }
            else -> _state.update {
                it.copy(
                    verifying = false,
                    error = AgroError.Unexpected(
                        "Google Play chưa hoàn tất giao dịch. Bạn thử lại giúp mình nhé.",
                        code = result.responseCode.toString(),
                    ),
                )
            }
        }
    }

    fun prepare(planSlug: String) {
        _state.update { it.copy(connecting = true, error = null, unavailableReason = null) }
        viewModelScope.launch {
            // The product id comes from the server, never from the APK: it is
            // chosen in the Play Console and cannot be renamed once published.
            val products = ErrorMapper.guard { api.playProducts() }
            if (products is AgroResult.Err) {
                _state.update {
                    it.copy(
                        connecting = false,
                        unavailableReason = "Thanh toán trên Google Play đang được hoàn thiện.",
                    )
                }
                return@launch
            }

            productId = products.valueOrNull.orEmpty()
                .firstOrNull { it.plan == planSlug }?.productId.orEmpty()
            if (productId.isBlank()) {
                _state.update {
                    it.copy(connecting = false, unavailableReason = "Gói này chưa mở bán trên Google Play.")
                }
                return@launch
            }

            connect()
        }
    }

    private fun connect() {
        val client = BillingClient.newBuilder(context)
            .setListener(purchasesListener)
            .enablePendingPurchases()
            .build()
        billingClient = client

        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    _state.update {
                        it.copy(connecting = false, unavailableReason = "Chưa kết nối được Google Play.")
                    }
                    return
                }
                queryProduct(client)
            }

            override fun onBillingServiceDisconnected() {
                _state.update { it.copy(connecting = false, unavailableReason = "Mất kết nối tới Google Play.") }
            }
        })
    }

    private fun queryProduct(client: BillingClient) {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                ),
            )
            .build()

        client.queryProductDetailsAsync(params) { result, details ->
            val product = details.firstOrNull()
            if (result.responseCode != BillingClient.BillingResponseCode.OK || product == null) {
                _state.update {
                    it.copy(connecting = false, unavailableReason = "Chưa lấy được giá từ Google Play.")
                }
                return@queryProductDetailsAsync
            }
            _state.update {
                it.copy(
                    connecting = false,
                    productDetails = product,
                    // Play's own formatted price, in the buyer's currency. Showing
                    // the SePay price here instead would be wrong the moment
                    // Google applies its own tax or regional pricing.
                    priceLabel = product.subscriptionOfferDetails
                        ?.firstOrNull()
                        ?.pricingPhases
                        ?.pricingPhaseList
                        ?.firstOrNull()
                        ?.formattedPrice
                        .orEmpty(),
                )
            }
        }
    }

    fun launch(activity: Activity) {
        val client = billingClient ?: return
        val product = _state.value.productDetails ?: return
        val offerToken = product.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(product)
                        .setOfferToken(offerToken)
                        .build(),
                ),
            )
            .build()

        client.launchBillingFlow(activity, params)
    }

    /**
     * Send the token to Django and let it decide.
     *
     * The app never grants anything from a `Purchase` object: the acknowledgement
     * happens on the server, after the entitlement is written, because Google
     * refunds anything unacknowledged after three days and an app-side
     * acknowledgement could land without the plan ever being granted.
     */
    private fun verify(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        _state.update { it.copy(verifying = true, error = null) }

        viewModelScope.launch {
            val result = ErrorMapper.guard {
                api.verifyPlayPurchase(
                    PlayVerifyRequest(
                        purchaseToken = purchase.purchaseToken,
                        productId = purchase.products.firstOrNull().orEmpty().ifBlank { productId },
                        packageName = context.packageName,
                        clientRequestId = UUID.randomUUID().toString(),
                    ),
                )
            }
            when (result) {
                is AgroResult.Ok -> _state.update { it.copy(verifying = false, granted = true) }
                is AgroResult.Err -> _state.update { it.copy(verifying = false, error = result.error) }
            }
        }
    }

    override fun onCleared() {
        billingClient?.endConnection()
        billingClient = null
    }
}

/**
 * Mua gói trên Google Play.
 *
 * When the server cannot verify a purchase — no service account configured — the
 * screen says so and offers nothing else. It does **not** fall back to a bank
 * transfer: for these digital features that is exactly the Play policy
 * violation the two flavours exist to prevent.
 */
@Composable
fun PlayBillingScreen(
    planSlug: String,
    onDone: () -> Unit,
    onBack: () -> Unit,
    viewModel: PlayBillingViewModel = hiltViewModel(),
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val colors = AgroTheme.colors

    LaunchedEffect(planSlug) { viewModel.prepare(planSlug) }
    LaunchedEffect(ui.granted) { if (ui.granted) onDone() }

    ui.unavailableReason?.let { reason ->
        StateBlock(
            art = StateArt.Contour,
            title = "Chưa mua được trên Google Play",
            body = "$reason Bạn quay lại sau giúp mình nhé.",
            primary = StateAction("Quay lại", onBack),
        )
        return
    }

    Column(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(AgroSpacing.gutterCompact),
        verticalArrangement = Arrangement.spacedBy(AgroSpacing.sm),
    ) {
        Text("Nâng cấp gói", style = AgroTheme.typography.screenTitle, color = colors.inkPrimary)

        if (ui.priceLabel.isNotBlank()) {
            Text(ui.priceLabel, style = AgroTheme.typography.display, color = colors.inkPrimary)
            Text(
                "Thanh toán và gia hạn do Google Play xử lý. Bạn quản lý hoặc huỷ trong ứng dụng " +
                    "Google Play bất cứ lúc nào.",
                style = AgroTheme.typography.body,
                color = colors.inkSecondary,
            )
        }

        ui.error?.let {
            Text(it.message, style = AgroTheme.typography.body, color = colors.danger)
        }

        PrimaryButton(
            label = "Mua trên Google Play",
            loadingLabel = if (ui.verifying) "Đang xác nhận với máy chủ…" else "Đang mở Google Play…",
            loading = ui.connecting || ui.verifying,
            enabled = ui.productDetails != null,
            onClick = { (context as? Activity)?.let(viewModel::launch) },
        )
        SecondaryButton(label = "Quay lại", onClick = onBack)
    }
}
