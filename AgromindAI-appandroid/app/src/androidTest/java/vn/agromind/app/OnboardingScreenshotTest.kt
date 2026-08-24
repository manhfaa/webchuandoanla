package vn.agromind.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import vn.agromind.app.core.designsystem.AgromindTheme
import vn.agromind.app.feature.auth.presentation.OnboardingScreen

class OnboardingScreenshotTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun firstPage_isReadableAndCapturable() {
        compose.setContent {
            AgromindTheme { OnboardingScreen(onFinished = {}) }
        }
        compose.onNodeWithText("Chụp rõ một chiếc lá").assertIsDisplayed()
        val image = compose.onNode(hasText("Chụp rõ một chiếc lá")).captureToImage()
        assertTrue(image.width > 0 && image.height > 0)
    }
}
