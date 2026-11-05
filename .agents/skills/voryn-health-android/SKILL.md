---
name: voryn-health-android
description: Diagnose or change Voryn phone step tracking, sleep suggestions, Health Connect import, native health permissions, or daily health aggregation. Use for Android health and sensor behavior, not general medical advice or unrelated UI work.
---

# Voryn health on Android

Read `docs/SAUDE-CELULAR.md` for the product's measurement boundaries. Treat any recorded test status as historical: use evidence from the current task and distinguish the user's device observation from a test you ran.

## Locate the source

- Native classes under `android/app/src/main/java/com/voryn/app/`: `PhoneHealthPlugin.kt`, `StepTrackingService.kt`, `HealthConnectPlugin.kt`, and registration in `MainActivity.java`.
- Permissions/components: `android/app/src/main/AndroidManifest.xml`.
- JS bridges: `src/services/phoneHealth.js` and `src/services/health.js`.
- Aggregation/manual entries: `src/services/healthRecords.js`, `healthOffline.js`, and `src/hooks/useHealthData.js`.
- Screens: `src/views/HealthView.jsx`, `HealthMetricView.jsx`, and `src/components/health/`.

## Preserve meaning

- Each day has a selected step source. `withPhoneSteps` uses the phone total instead of adding it to Health Connect. Check source precedence and manual entries before changing totals.
- Distinguish zero, unavailable, unauthorized, and stale values. Read permission does not imply that another health app wrote any records.
- Phone sleep suggestions estimate an interval; they do not measure stages or establish that the user slept. Preserve confirmation/editing and honest labels.
- Water, nutrition, and weight are manual/imported data, not automatically measured by the phone. Do not infer calories, weight, or other measurements without an implemented data source.
- Use local dates for daily buckets and inspect counter reset/reboot semantics when a step total jumps.

## Verify the affected platform boundary

Use existing tests as appropriate: `src/__tests__/phoneHealth.test.js`, `health.test.js`, `healthRecords.test.js`, `healthOffline.test.js`, `HealthView.test.jsx`, and `HomeHealthCards.test.jsx`.

For changes to native sensors/services, require an actual native build and a device/emulator check suitable for the affected API before claiming end-to-end success. Cover relevant permission granted/denied/revoked states and, for background tracking, screen off, offline, pause/resume, restart/reboot, and battery restrictions. Do not reset a user's health app or uninstall Voryn to simplify testing.

If no suitable device is available, complete code and automated checks and state precisely which native behaviors remain unverified. Do not label a mocked bridge test as a sensor test.
