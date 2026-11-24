# Diamond Store NP — Android Kotlin + Jetpack Compose

This directory contains the native Android Jetpack Compose implementation of **Diamond Store** for Free Fire Nepal (NP) diamond top-ups.

## Configuration
1. Open `/android` in **Android Studio** (Ladybug or newer).
2. Download `google-services.json` from Firebase Console for project `gen-lang-client-0118049188` (package name `com.diamondstore.np`, SHA-1 registered for Credential Manager Google Sign-In) and place it in `android/app/google-services.json`.
3. Firestore security rules are defined in the repository root `/firestore.rules` and enforce exclusive admin access for `rc0470638@gmail.com` (`email_verified == true`).
4. No Gemini API key or AI SDKs are included.
