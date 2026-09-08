import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.androidx.baselineprofile)
}

/**
 * Values a developer sets locally. Absent on CI, where the same names come from
 * the environment, so a missing file is a default rather than a build failure.
 */
val local = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun config(name: String, fallback: String = ""): String =
    (local.getProperty(name) ?: System.getenv(name) ?: fallback).trim()

val keystoreFile = config("AGROMIND_KEYSTORE_FILE")

android {
    namespace = "vn.agromind.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "vn.agromind.app"
        // Android 8.0. Below that, Keystore-backed AES/GCM and the modern
        // security-config behaviour we rely on are not dependable.
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true

        // Only public values reach BuildConfig, because everything here ships
        // inside the APK. See local.properties.example.
        buildConfigField("String", "WEBSITE_URL", "\"https://www.agromind.farm\"")
    }

    signingConfigs {
        if (keystoreFile.isNotEmpty()) {
            create("release") {
                storeFile = file(keystoreFile)
                storePassword = config("AGROMIND_KEYSTORE_PASSWORD")
                keyAlias = config("AGROMIND_KEY_ALIAS")
                keyPassword = config("AGROMIND_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            isDebuggable = true
            // The only build allowed to speak cleartext, and only to the
            // emulator loopback declared in network_security_config_debug.xml.
            buildConfigField(
                "String",
                "BASE_URL",
                "\"${config("AGROMIND_DEBUG_BASE_URL", "http://10.0.2.2:8000/")}\"",
            )
            buildConfigField("boolean", "VERBOSE_NETWORK_LOG", "true")
        }
        create("staging") {
            initWith(getByName("debug"))
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            isDebuggable = true
            matchingFallbacks += listOf("debug")
            // Falls back to production rather than to an invented hostname: a
            // staging build pointing nowhere is harder to notice than one
            // pointing at production.
            buildConfigField(
                "String",
                "BASE_URL",
                "\"${config("AGROMIND_STAGING_BASE_URL", "https://api.agromind.farm/")}\"",
            )
            buildConfigField("boolean", "VERBOSE_NETWORK_LOG", "false")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            isDebuggable = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "BASE_URL", "\"https://api.agromind.farm/\"")
            buildConfigField("boolean", "VERBOSE_NETWORK_LOG", "false")
            if (keystoreFile.isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    /**
     * Two distributions, two payment policies, two binaries.
     *
     * Google Play requires Play Billing for the digital features Grow/Bloom/Elite
     * unlock, so the `play` flavour must not contain a SePay entry point at all —
     * not a hidden one, not a deep link. The `direct` APK is distributed outside
     * Play and keeps the existing bank-transfer flow. Shipping one binary that
     * decides at runtime would put a policy violation inside the Play artifact.
     */
    flavorDimensions += "distribution"
    productFlavors {
        create("direct") {
            dimension = "distribution"
            buildConfigField("boolean", "SEPAY_ENABLED", "true")
            buildConfigField("boolean", "PLAY_BILLING_ENABLED", "false")
            buildConfigField("String", "DISTRIBUTION", "\"direct\"")
        }
        create("play") {
            dimension = "distribution"
            buildConfigField("boolean", "SEPAY_ENABLED", "false")
            buildConfigField("boolean", "PLAY_BILLING_ENABLED", "true")
            buildConfigField("String", "DISTRIBUTION", "\"play\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = false
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf("-opt-in=kotlin.RequiresOptIn")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources.excludes += setOf(
            "/META-INF/{AL2.0,LGPL2.1}",
            "/META-INF/DEPENDENCIES",
            "META-INF/LICENSE*",
        )
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    lint {
        warningsAsErrors = false
        abortOnError = true
        disable += "GradleDependency"
    }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
    arg("room.generateKotlin", "true")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material3.window.size)
    implementation(libs.androidx.compose.material.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    implementation(libs.androidx.navigation.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.navigation.compose)
    implementation(libs.androidx.hilt.work)
    ksp(libs.androidx.hilt.compiler)

    implementation(libs.retrofit)
    implementation(libs.retrofit.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    implementation(libs.androidx.room.paging)
    ksp(libs.androidx.room.compiler)

    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.paging.runtime)
    implementation(libs.androidx.paging.compose)
    implementation(libs.androidx.work.runtime)

    implementation(libs.coil.compose)

    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.androidx.exifinterface)

    implementation(libs.androidx.profileinstaller)

    // Play Billing is linked into the Play artifact only. The direct APK has no
    // reason to carry it and no way to use it.
    "playImplementation"(libs.billing.ktx)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.mockk)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.androidx.room.testing)

    androidTestImplementation(libs.androidx.test.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    baselineProfile(project(":benchmark"))
}
