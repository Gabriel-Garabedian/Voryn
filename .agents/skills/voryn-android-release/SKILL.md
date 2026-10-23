---
name: voryn-android-release
description: Prepare, inspect, or publish a Voryn Android APK release, including version codes, signing continuity, installation over an existing app, download metadata, and update notices. Use for APK builds and distribution, not ordinary website deployments.
---

# Voryn Android release

Use paths relative to the repository root. Read `docs/ANDROID-UPDATES.md` for the current publication procedure and `ANDROID.md` for native setup. Inspect their instructions against the actual files; do not assume the previous session's version is still current.

## Inspect first

Run `node .agents/skills/voryn-android-release/scripts/inspect-release.mjs`. This is a read-only metadata and file check; it does not build, install, sign, or publish anything. `--ready` also requires the announced release and next-build metadata to agree. A deliberate older public release is valid while preparing a new APK.

- Read `android/app/build.gradle` for Android `versionCode` and `versionName`; `package.json` has a separate web/package version.
- Read `public/android-release.json` and `src/pages/DownloadAndroidPage.jsx` together. The announced version must describe the APK actually distributed, not unfinished source code.
- Check Node 22+, JDK, Android SDK, and the Gradle wrapper before attempting a native build. Detect missing prerequisites rather than retrying a failed build unchanged.
- The native app bundles `dist`; a Git push alone does not update an installed APK.

## Build and distribution

1. For an authorized build, use `npm run android:apk`. Its sync step also runs `scripts/prepare-native-assets.mjs` so website APK downloads are excluded from the native bundle.
2. Preserve the currently published production `applicationId` and signing-key continuity. The legacy 1.6 app is `com.voryn.app`; because its original key is unavailable, the explicitly authorized production successor is `com.voryn.mobile` with its own permanent key. Confirm the actual APK version and signing certificate using SDK tools when available. A filename or SHA-256 does not establish the signing identity. Never expose keystore passwords or change the signing key to bypass an update failure.
3. Use a test device/emulator for installation over the existing app without uninstalling. Check preserved pending records, reopening an authenticated session, and native export. Device access/installation must fit the current task authorization.
4. Only after a candidate exists and is validated, place it under a new versioned name in `public/downloads/`, update the public manifest and download page together, and verify the candidate's native version/signature. Do not advertise a build that failed or was never generated.
5. Commit, push, deploy, or change external hosting only when requested or already authorized for this release. Publication of a website and distribution of a new APK are separate outcomes.

## Update notice checks

`src/services/appUpdate.js`, `src/components/ui/AppUpdateBanner.jsx`, and `android/app/src/main/java/com/voryn/app/AppUpdatePlugin.java` implement detection and browser download. Inspect both fixed-domain references if hosting changes. Verify the public JSON is uncached, has the required CORS header, points to an accessible APK, and uses a code greater than the installed build. The current mechanism runs inside the authenticated app, not as a closed-app push notification. An older APK without this mechanism requires one manual update first.

Use `src/__tests__/appUpdate.test.js`, `AppUpdateBanner.test.jsx`, `androidDownload.test.jsx`, and `appStartup.test.jsx` as relevant. Check the notice is hidden during an active workout and can be dismissed.

Report separately: web build, native APK build, actual APK metadata/signature, device installation, and public download/deployment. Name any stage not verified.
