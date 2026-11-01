# Android application

The Android app bundles the same `web/` interface and deterministic simulation engine. It needs Android 8.0 (API 26) or later with an updated Android System WebView. Target/compile SDK is 35, Android Gradle Plugin is 8.9.1 and Gradle is 8.11.1. A full JDK 17+ is required, including `javac` and `jlink`; a Java runtime alone is insufficient.

Build from the project root with `bash scripts/build-android.sh`, or open `android/` in Android Studio and sync/build. The standard Gradle wrapper includes its JAR, Unix and Windows launchers, and a pinned distribution SHA-256. The build script provisions a project-local Android SDK and Gradle cache, accepts the Android SDK licenses, and copies the debug APK to `artifacts/morrow-deck-lab-debug.apk`. Internet access is needed for initial toolchain downloads. No release signing key or store publishing is configured.

The debug APK was assembled successfully using Temurin JDK 21.0.13+9, Android SDK 35 and Build Tools 35.0.0 on 1 November 2026. Its APK Signature Scheme v2 signature verifies, and every bundled web asset matches the final source. No emulator or physical-device execution is claimed.

The wrapper uses a custom `WebViewClient` asset handler equivalent to a local asset loader. Assets are served only at `https://appassets.androidplatform.net/assets/web/`, with correct JavaScript module MIME types, path traversal rejection and `nosniff`. File/content access and mixed content are disabled. HTTPS links outside the app open in the system browser. There is no native JavaScript bridge. The only requested Android permission is `INTERNET`. Native system-bar, cutout and keyboard insets keep controls within the available screen area on Android 8–15. Use a current Android System WebView for modern JavaScript support.

Deck/session storage stays in the app's WebView storage. Android backup is disabled. Scryfall GET requests and images use the public Scryfall service; no API key or AI backend is required. Clearing app data removes local decks and sessions.

A debug APK is for sideload testing. Device/emulator interaction, system WebView compatibility, rotation, storage persistence, touch gestures and Scryfall import should be checked before a release. The bounded simulator is not a complete MTG rules engine.
