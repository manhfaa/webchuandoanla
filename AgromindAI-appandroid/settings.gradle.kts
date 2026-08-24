pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "AgromindAI"

// One application module on purpose. Splitting into Gradle modules buys parallel
// compilation and enforced boundaries, and costs configuration time and a lot of
// build files. Neither the build time nor the number of people working in here
// justifies that yet; the package layout (core/* and feature/*) already draws the
// boundaries, so extracting modules later is a move, not a redesign.
include(":app")
include(":benchmark")
