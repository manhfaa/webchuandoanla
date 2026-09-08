package vn.agromind.app.core.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import vn.agromind.app.core.config.AppConfig
import vn.agromind.app.core.designsystem.components.AgromindScaffold
import vn.agromind.app.core.designsystem.components.OfflineState
import vn.agromind.app.core.designsystem.components.StateAction
import vn.agromind.app.core.designsystem.components.TopTab
import vn.agromind.app.core.designsystem.components.StateArt
import vn.agromind.app.core.designsystem.components.StateBlock
import vn.agromind.app.core.security.SessionState
import vn.agromind.app.feature.auth.presentation.ForgotPasswordScreen
import vn.agromind.app.feature.auth.presentation.LoginScreen
import vn.agromind.app.feature.auth.presentation.RegisterScreen
import vn.agromind.app.feature.auth.presentation.SplashScreen
import vn.agromind.app.feature.auth.presentation.OnboardingScreen
import vn.agromind.app.feature.auth.presentation.ResetPasswordScreen
import vn.agromind.app.feature.auth.presentation.ChangePasswordScreen
import vn.agromind.app.feature.auth.presentation.DeleteAccountScreen
import vn.agromind.app.feature.diagnosis.presentation.DiagnosisFlowScreen
import vn.agromind.app.feature.diagnosis.presentation.ResultScreen
import vn.agromind.app.feature.billing.PurchaseFlow
import vn.agromind.app.feature.billing.presentation.PlansScreen
import vn.agromind.app.feature.chat.presentation.ChatChooserScreen
import vn.agromind.app.feature.chat.presentation.ChatScreen
import vn.agromind.app.feature.cropplans.presentation.CropPlanDetailScreen
import vn.agromind.app.feature.cropplans.presentation.CropPlanListScreen
import vn.agromind.app.feature.cropplans.presentation.CropPlanWizardScreen
import vn.agromind.app.feature.garden.presentation.GardenScreen
import vn.agromind.app.feature.garden.presentation.PlotFormScreen
import vn.agromind.app.feature.garden.presentation.PlotJournalScreen
import vn.agromind.app.feature.garden.presentation.TraceabilityScreen
import vn.agromind.app.feature.history.presentation.HistoryScreen
import vn.agromind.app.feature.home.presentation.TodayScreen
import vn.agromind.app.feature.library.presentation.LibraryScreen
import vn.agromind.app.feature.more.presentation.MoreScreen
import vn.agromind.app.feature.profile.presentation.ProfileScreen
import vn.agromind.app.feature.weather.presentation.WeatherScreen

/**
 * The whole navigation graph.
 *
 * Two rules drive the shape:
 *
 * 1. **The session decides the start destination, not the back stack.** When a
 *    refresh finally fails, every screen that needed a token is invalid, so the
 *    graph moves to Login and clears behind it rather than leaving a half-loaded
 *    Today underneath.
 * 2. **A deep link is held, not dropped.** `agromind://diagnosis/482` tapped
 *    while signed out survives the trip through Login and opens the result
 *    afterwards. Losing it would leave the grower on a home screen wondering
 *    what the notification was about.
 */
@Composable
fun AgromindNavHost(
    navController: NavHostController,
    session: SessionState,
    config: AppConfig,
    onboardingSeen: Boolean,
    pendingDeepLink: DeepLink?,
    onDeepLinkConsumed: () -> Unit,
    onOnboardingFinished: () -> Unit,
    offlineState: OfflineState,
) {
    // A server-declared outage and a build below the supported floor both take
    // over the whole graph: there is nothing useful behind them, and letting the
    // grower wander into screens that will only fail is worse than saying why.
    val forced = when {
        config.updateRequired -> Route.UpdateRequired
        config.maintenance -> Route.Maintenance
        else -> null
    }

    LaunchedEffect(session, forced, pendingDeepLink) {
        when {
            forced != null -> navController.navigateSingleTop(forced, clearStack = true)

            session is SessionState.Loading -> Unit

            session is SessionState.SignedIn -> {
                val target = pendingDeepLink?.route() ?: Route.Today
                navController.navigateSingleTop(target, clearStack = pendingDeepLink == null)
                if (pendingDeepLink != null) onDeepLinkConsumed()
            }

            // Expired and SignedOut both end at Login. They differ in what the
            // grower is told, which is the screen's job, not the graph's.
            pendingDeepLink?.worksSignedOut == true -> {
                navController.navigateSingleTop(pendingDeepLink.route(), clearStack = true)
                onDeepLinkConsumed()
            }

            !onboardingSeen -> navController.navigateSingleTop(Route.Onboarding, clearStack = true)

            else -> navController.navigateSingleTop(Route.Login, clearStack = true)
        }
    }

    NavHost(navController = navController, startDestination = Route.Splash) {

        composable(Route.Splash) {
            SplashScreen(expired = session is SessionState.Expired)
        }

        composable(Route.Onboarding) {
            OnboardingScreen(onFinished = onOnboardingFinished)
        }

        composable(Route.ResetPassword) {
            ResetPasswordScreen(onBack = { navController.navigateSingleTop(Route.Login, clearStack = true) })
        }

        composable(Route.Login) {
            LoginScreen(
                onSignedIn = { /* the session flow above moves the graph */ },
                onRegister = { navController.navigate(Route.Register) },
                onForgotPassword = { navController.navigate(Route.ForgotPassword) },
                googleSignInAvailable = config.googleSignIn && vn.agromind.app.BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank(),
            )
        }

        composable(Route.Register) {
            val context = androidx.compose.ui.platform.LocalContext.current
            RegisterScreen(
                onRegistered = { /* the session flow above moves the graph */ },
                onBack = { navController.popBackStack() },
                termsUrl = config.termsUrl,
                privacyUrl = config.privacyUrl,
                onOpenLink = { url -> context.openExternally(url) },
            )
        }

        composable(Route.ForgotPassword) {
            val context = androidx.compose.ui.platform.LocalContext.current
            ForgotPasswordScreen(
                onBack = { navController.popBackStack() },
                supportUrl = config.supportUrl,
                onOpenSupport = { url -> context.openExternally(url) },
            )
        }

        composable(Route.Maintenance) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                StateBlock(
                    art = StateArt.Contour,
                    title = "Hệ thống đang bảo trì",
                    body = config.maintenanceMessage.ifBlank {
                        "Mình đang nâng cấp máy chủ. Bạn quay lại sau ít phút giúp mình nhé."
                    },
                    primary = StateAction("Thử lại") { },
                )
            }
        }

        composable(Route.UpdateRequired) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                StateBlock(
                    art = StateArt.Contour,
                    title = "Bạn cần cập nhật ứng dụng",
                    body = "Phiên bản này không còn dùng được với máy chủ. Bạn cập nhật rồi mở lại giúp mình nhé.",
                    primary = StateAction("Cập nhật") { },
                )
            }
        }

        composable(Route.Check) {
            DiagnosisFlowScreen(
                onOpenResult = { id ->
                    // The flow destination is popped: coming back from a saved
                    // result must not land on the four-step wizard holding a
                    // photo that has already been filed.
                    navController.navigate(Route.diagnosisResult(id)) {
                        popUpTo(Route.Check) { inclusive = true }
                    }
                },
                onLeave = { navController.popBackStack() },
                onUpgrade = { navController.navigate(Route.Plans) },
            )
        }

        composable(Route.DiagnosisResult) {
            ResultScreen(
                onAskAboutResult = { id ->
                    navController.navigate(Route.chatConversation("assistant", id))
                },
                onAddToJournal = { navController.navigate(Route.Garden) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(Route.Today) {
            AppShell(TopTab.Today, navController, offlineState) { padding ->
                TodayScreen(
                    contentPadding = padding,
                    onStartCheck = { navController.navigate(Route.Check) },
                    onOpenResult = { id -> navController.navigate(Route.diagnosisResult(id)) },
                    onSeeAll = { navController.navigateTab(TopTab.History) },
                )
            }
        }

        composable(Route.History) {
            AppShell(TopTab.History, navController, offlineState) { padding ->
                HistoryScreen(
                    contentPadding = padding,
                    onOpen = { id -> navController.navigate(Route.diagnosisResult(id)) },
                    onStartCheck = { navController.navigate(Route.Check) },
                )
            }
        }

        composable(Route.More) {
            AppShell(TopTab.More, navController, offlineState) { padding ->
                MoreScreen(
                    contentPadding = padding,
                    onChat = { navController.navigate(Route.ChatChooser) },
                    onPlans = { navController.navigate(Route.Plans) },
                    onProfile = { navController.navigate(Route.Profile) },
                    onWeather = { navController.navigate(Route.Weather) },
                    onCropPlans = { navController.navigate(Route.CropPlans) },
                    onLibrary = { navController.navigate(Route.Library) },
                    weatherReady = true,
                    cropPlansReady = true,
                    libraryReady = true,
                )
            }
        }

        composable(Route.Garden) {
            AppShell(TopTab.Garden, navController, offlineState) { padding ->
                GardenScreen(
                    contentPadding = padding,
                    onOpenPlot = { id -> navController.navigate(Route.plotJournal(id)) },
                    onAddPlot = { navController.navigate(Route.PlotForm) },
                    onTraceability = { navController.navigate(Route.Traceability) },
                )
            }
        }

        composable(Route.PlotForm) {
            PlotFormScreen(
                onSaved = { navController.popBackStack() },
                onCancel = { navController.popBackStack() },
            )
        }

        composable(Route.Traceability) {
            TraceabilityScreen(onBack = { navController.popBackStack() })
        }

        composable(Route.PlotJournal) {
            PlotJournalScreen(
                plotName = "",
                today = todayIso(),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Route.Weather) {
            WeatherScreen(
                onBack = { navController.popBackStack() },
                onAddLocation = { navController.navigate(Route.PlotForm) },
            )
        }

        composable(Route.Library) {
            LibraryScreen(onBack = { navController.popBackStack() })
        }

        composable(Route.CropPlans) {
            CropPlanListScreen(
                onOpenPlan = { id -> navController.navigate(Route.cropPlanDetail(id)) },
                onCreate = { navController.navigate(Route.CropPlanWizard) },
                onBack = { navController.popBackStack() },
            )
        }

        composable(Route.CropPlanWizard) {
            CropPlanWizardScreen(
                onCreated = { id ->
                    navController.navigate(Route.cropPlanDetail(id)) {
                        popUpTo(Route.CropPlanWizard) { inclusive = true }
                    }
                },
                onCancel = { navController.popBackStack() },
                onUpgrade = { navController.navigate(Route.Plans) },
            )
        }

        composable(Route.CropPlanDetail) {
            CropPlanDetailScreen(
                todayIso = todayIso(),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Route.Checkout) { entry ->
            // Resolved per flavour: the direct build compiles the SePay screen,
            // the Play build compiles the Play Billing screen, and neither
            // artifact contains the other.
            PurchaseFlow(
                planSlug = entry.arguments?.getString("plan").orEmpty(),
                onDone = {
                    navController.navigate(Route.Plans) {
                        popUpTo(Route.Checkout) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        composable(Route.Profile) {
            AppShell(TopTab.More, navController, offlineState) { padding ->
                ProfileScreen(
                    contentPadding = padding,
                    // The session flow at the top of this file sees SignedOut and
                    // moves the graph; nothing to do here but let it.
                    onSignedOut = { },
                    onChangePassword = { navController.navigate(Route.ChangePassword) },
                    onDeleteAccount = { navController.navigate(Route.DeleteAccount) },
                )
            }
        }

        composable(Route.ChangePassword) {
            ChangePasswordScreen(onBack = { navController.popBackStack() })
        }

        composable(Route.DeleteAccount) {
            DeleteAccountScreen(onBack = { navController.popBackStack() })
        }

        composable(Route.Plans) {
            AppShell(TopTab.More, navController, offlineState) { padding ->
                PlansScreen(
                    contentPadding = padding,
                    canPurchase = config.canPurchase,
                    onStartPurchase = { slug -> navController.navigate(Route.checkout(slug)) },
                )
            }
        }

        composable(Route.ChatChooser) {
            ChatChooserScreen(
                onPickAssistant = { navController.navigate(Route.chatConversation("assistant")) },
                onPickExpert = { navController.navigate(Route.chatConversation("expert")) },
                expertAvailable = config.expertChat,
            )
        }

        composable(Route.ChatConversation) {
            ChatScreen(
                onBack = { navController.popBackStack() },
                onUpgrade = { navController.navigate(Route.Plans) },
            )
        }

        // Destinations from milestones that are not built yet. They are listed
        // here rather than left missing so a deep link or a stale back stack
        // lands on an honest screen instead of crashing the graph — and so the
        // gap is visible in the code rather than only in a plan document.
    }
}

/**
 * Explicitly "chưa xây dựng", never fake content.
 *
 * The release gate is that no such destination survives into a shipped build;
 * having it say so plainly is what makes that gate checkable.
 */
@Composable
private fun NotBuiltYet(route: String, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        StateBlock(
            art = StateArt.LeafLens,
            title = "Phần này đang được xây dựng",
            body = "Mục này chưa sẵn sàng trong bản dựng nội bộ. Bạn quay lại màn trước giúp mình nhé.",
            primary = StateAction("Quay lại", onBack),
            supportCode = route,
        )
    }
}

/**
 * The frame the five top-level destinations share.
 *
 * Applied per destination rather than around the whole `NavHost`, because the
 * check flow, the result screen and the auth screens must **not** have a
 * navigation bar: they are modal tasks, and a bar that lets someone leave a
 * half-finished leaf check by tapping "Vườn" loses their work.
 */
@Composable
private fun AppShell(
    tab: TopTab,
    navController: NavHostController,
    offlineState: OfflineState,
    content: @Composable (androidx.compose.foundation.layout.PaddingValues) -> Unit,
) {
    // Derived from the current width rather than from a device category: a phone
    // in landscape and a small tablet are the same layout problem, and a
    // foldable changes class while the app is running.
    val widthDp = androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp
    val sizeClass = when {
        widthDp < 600 -> WindowWidthSizeClass.Compact
        widthDp < 840 -> WindowWidthSizeClass.Medium
        else -> WindowWidthSizeClass.Expanded
    }

    AgromindScaffold(
        widthSizeClass = sizeClass,
        selected = tab,
        onSelect = { navController.navigateTab(it) },
        // Wired to a real connectivity source in the offline milestone; until
        // then it reports Online rather than guessing, because a banner that
        // claims "đang offline" while requests are succeeding is worse than none.
        offline = offlineState,
        content = content,
    )
}

private fun NavHostController.navigateTab(tab: TopTab) {
    val route = when (tab) {
        TopTab.Today -> Route.Today
        TopTab.History -> Route.History
        TopTab.Check -> Route.Check
        TopTab.Garden -> Route.Garden
        TopTab.More -> Route.More
    }
    if (currentDestination?.route == route) return
    navigate(route) {
        launchSingleTop = true
        restoreState = true
        // Switching tabs must not stack: five taps between "Hôm nay" and "Lịch
        // sử" should leave one entry to back out of, not five.
        popUpTo(Route.Today) { saveState = true }
    }
}

/**
 * Today, as the server's date format expects it.
 *
 * The device timezone is used deliberately: a grower marking a step done at
 * 23:30 in Vietnam means today in Vietnam, not tomorrow in UTC.
 */
private fun todayIso(): String = java.time.LocalDate.now().toString()

/**
 * Opens a link in the browser, never in a WebView.
 *
 * Terms, privacy and support pages are not ours to frame: rendering them inside
 * the app makes them look like the app saying it, and it hides the URL the
 * grower would need to check that they are on the real site.
 */
private fun android.content.Context.openExternally(url: String) {
    if (url.isBlank()) return
    runCatching {
        startActivity(
            android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)),
        )
    }
}

private fun NavHostController.navigateSingleTop(route: String, clearStack: Boolean) {
    if (currentDestination?.route == route) return
    navigate(route) {
        launchSingleTop = true
        if (clearStack) popUpTo(graph.startDestinationId) { inclusive = true }
    }
}
