# Good Signal offline web bundle

With the existing Python dependencies from `requirements.txt` installed, run `python mobile/build_offline.py` from the project root to create the Android WebView bundle at `mobile/app/src/main/assets/www`. The builder uses the existing HTML, CSS, JavaScript, source data, and guide images. It imports `server.resource_detail_html` only during generation to create escaped, static resource detail pages; the packaged app does not run FastAPI.

## WebView contract

- Load `https://appassets.androidplatform.net/`.
- Keep root-absolute links, scripts, styles, and image paths unchanged.
- Map `/` to `www/index.html`; `/explore`, `/find`, `/focus`, `/guides`, `/safety`, `/about`, and `/feedback` to each route's `index.html` folder.
- Map `/guide/<slug>` and `/resource/<id>` to their corresponding route folders. Exact static asset paths map directly to `www/<path>`.
- Read `mobile-route-manifest.json` for the complete route list. `/android-settings` is a same-origin link for the Android `shouldOverrideUrlLoading` handler.
- Use local system font fallbacks; no remote fonts, server APIs, or FastAPI runtime are required. The native shell serves local files on the synthetic HTTPS origin, blocks WebView network loads, and opens external HTTPS links in the device browser. It does not request the INTERNET permission.

Feedback explains that the offline app neither submits nor saves responses. The focus timer uses a wall-clock deadline and checks elapsed time when the app becomes visible. Navigating away from an active focus block triggers the existing unload confirmation. The focus timer does not schedule a background alarm; the opt-in native sleep reminder described below is separate.

`preview_server.py` mirrors the route-to-file mapping for local browser QA when local socket access is available. Version 5 was installed as an update and launched on an Android emulator with airplane mode enabled. The home screen and system-bar spacing were visually checked; QA screenshots are in `output/android-qa`. A physical-device check remains.

## Build the APK

After generating the offline bundle, run `powershell -NoProfile -ExecutionPolicy Bypass -File mobile/build-apk.ps1` from the project root. This uses the Android SDK in `mobile/toolchain/sdk` (platform 36, build tools 35.0.0) and the installed Oracle JDK 24; Android Studio and Gradle are not required. The signed result is `output/Good_Signal.apk`. The script verifies its signature.

The build requires the existing `mobile/toolchain/good-signal-signing.jks` and `mobile/toolchain/signing-password.txt`; it refuses to create a replacement identity. Keep both private and backed up together, because updates require the same key. The APK supports Android 7 (API 24) and newer. Test it on a device before distribution.





## Native wellness (version 6 / 2.0)

The local-only WebView exposes `GoodSignalAndroid.getWellnessState()`, `openUsageSettings()`, `requestNotifications()`, `saveSleepReminder(enabled, hour, minute)`, `sendTestNotification()`, and `openNotificationSettings()`. The state and result methods return JSON strings. A `goodsignal-native-update` window event is dispatched on activity resume and notification permission results. Permissions are requested only in response to user actions.

With usage access granted, Android's retained usage events are aggregated on demand into local calendar days. These are estimates, not the private Digital Wellbeing database: history may be missing or truncated and the observed session start may predate retained events. Overall totals union overlapping sessions; per-app durations can overlap in split screen. The manifest grants visibility to apps with launcher activities to help resolve labels, and only packages observed in usage events are looked up. Labels for other or unavailable packages fall back to a package-name suffix. Without access, no usage is fabricated. Raw events are not stored by this app.

Sleep reminders are opt-in and stored locally. Android may delay the inexact alarm, particularly in battery-saving modes. It is recalculated after delivery, reboot, clock changes, timezone changes, and app launch after a force-stop. Android does not deliver alarms while an app remains force-stopped; open Good Signal again to restore an enabled reminder. The app checks both notification permission and the reminder channel before enabling a reminder or sending a test. The app declares PACKAGE_USAGE_STATS for user-controlled usage access, POST_NOTIFICATIONS for Android 13 and newer, and RECEIVE_BOOT_COMPLETED to restore reminders after restart. No network, accessibility, broad package visibility, or exact-alarm permission is used.

## Android 16 usage-access recovery (version 2.1 / code 7)

The reported Android 16 warning about personal and financial information, linking to Google's restricted-settings help, is an OS restricted-settings block. It is not a grant the app can perform itself. The app offers optional native help and opens its own App info page. If the device provides it, the user can review the App info overflow menu's **Allow restricted settings** action, confirm only if they trust this APK, and then return to **Usage access** to enable Good Signal. Work-profile, parental-control and device-policy restrictions must be resolved by their administrator; the app never bypasses them. Menu names and availability vary by device. Official sources checked 2026-11-18: [Google Android Help](https://support.google.com/android/answer/12623953), [Android 15 CDD section 9.8](https://source.android.com/docs/compatibility/15/android-15-cdd), [AppOpsManager API](https://developer.android.com/reference/android/app/AppOpsManager).

### Native bridge contract for the phone interface

`getWellnessState()` remains a JSON string with all existing fields. Additive fields:

| Field | Values / meaning |
| --- | --- |
| `usageStatus` | `ready`, `needs_access`, `locked`, `unavailable` |
| `usageMessage` | Human-readable explanation of the current state |
| `usageAppOpMode` | Android AppOps integer, when the check succeeded; diagnostic only |
| `usageRecoveryAction` | `none`, `usage_settings`, `unlock_device`, `retry` |
| `restrictedSettingsMayApply` | Recovery hint on Android 13+ without access; **not** a detected restriction |

`usageGranted` is checked dynamically on every call; `MODE_ALLOWED` grants access, while `MODE_DEFAULT` falls back to the manifest permission's actual grant. Never treat a non-empty event query as proof of permission. A second check after collection clears results if access was revoked. Locked history is reported separately from a denied grant; no-data and API failures must not be described as an OS refusal. Queries run on the JavaScript-interface worker thread, not the Android main thread. The synchronous bridge may still occupy the JavaScript caller during a long history query; do not poll it rapidly.

New no-argument actions: `openAppSettings()` opens App info with general Settings fallback; `showUsageAccessHelp()` presents the rationale, conditional restricted-settings recovery, and buttons for Usage access / App info / Later. Existing `openUsageSettings()` now opens the package-specific screen first, with the general usage-access list as fallback. The UI should provide an explicit Refresh action calling `getWellnessState()` after the user returns; Android `onResume` also dispatches `goodsignal-native-update`.

`setSystemTheme(boolean dark)` updates native system-bar icon contrast, the inset background and WebView background, and remembers the preference. Native page-finished handling syncs `html[data-theme]` and observes subsequent attribute changes, including pages without dashboard code. The UI can call the bridge directly too. Notification requests now offer a rationale on repeatable denial and open notification settings after permanent denial rather than looping prompts.

### Security hardening and alignment update

- Area / priority: user-controlled special-access recovery and stateless permission checks, high usability impact; no privilege escalation.
- Modified native classes: `WellnessBridge.java`, `MainActivity.java`. Build version changed in `build-apk.ps1`. No manifest permission, dependency, component export, signing identity, or private key changed.
- Permission decisions are never cached. Settings Intents use constant actions and the app's own package, not incoming extras. No nested Intent is accepted. Native help does not invoke hidden EnhancedConfirmation APIs, shell AppOps grants, installer impersonation, or accessibility services.
- Existing reminder PendingIntents are explicit and immutable; receiver remains non-exported and its boot/time broadcasts are system-protected. Launcher activity remains exported for launcher use, but reads no untrusted incoming extras.
- Lifecycle: WebView teardown removes the JavaScript bridge; updates skip destroyed activities; each local navigation refreshes state and native theme.
- Keyboard: Activity uses `adjustResize`; Android 15+ edge-to-edge container reserves the greater of the IME or system-bar bottom inset, without adding them together. WebView text zoom remains at its platform default to preserve system scaling; parent QA should inspect `getSettings().getTextZoom()` at font scale 1.0 / 1.3 / 1.5 before introducing an additional multiplier.
- Validation: all native Java sources compiled against platform 36 using JDK 24 with `--release 8`. Parent owns emulator validation and final signing/build; no claim of Android 16 device execution is made here.

Implementation delta (the source files contain the complete changes):

```diff
- return appOpsMode == MODE_ALLOWED;
+ return appOpsMode == MODE_ALLOWED || (appOpsMode == MODE_DEFAULT && permissionGranted);
- launch(new Intent(ACTION_USAGE_ACCESS_SETTINGS));
+ launch(new Intent(ACTION_USAGE_ACCESS_SETTINGS, ownPackageUri), generalUsageSettings);
+ openAppSettings(); showUsageAccessHelp(); setSystemTheme(dark);
+ usageStatus / usageMessage / usageRecoveryAction / restrictedSettingsMayApply;
+ recheck after query; clear usage after revocation; distinguish locked history;
+ permanent notification denial opens settings; repeatable denial shows rationale;
+ native theme sync on page finish; WebView teardown removes bridge;
- --version-code 6 --version-name 2.0
+ --version-code 7 --version-name 2.1
```

The official Android CLI is installed locally at `mobile/toolchain/android-cli/android.exe`; use `--sdk mobile/toolchain/sdk` to retain this project's SDK. No Android Studio or global PATH change is needed.

## Instrumentation harness usage

### Neutral native shell (version 2.2 / code 8)

Launcher mark: `res/drawable/ic_launcher.xml` now uses three ascending blue (`#4c5fc8`) signal bars on a neutral (`#f7f8fa`) rounded tile. It is a code-native Android vector, with no generated bitmap dependency. The existing monochrome notification icon is unchanged.

The native window, WebView loading background, and inset areas use `#f7f8fa` in light mode and `#111318` in dark mode, matching the phone redesign. `setSystemTheme(boolean)` and the existing `data-theme` observer keep native bar icons and backgrounds synchronized across navigation; the preference is retained before web content reloads. On API 30+ the shell also applies `WindowInsetsController` appearance flags. Automatic status/navigation contrast scrims are disabled on API 29+ because the shell provides an opaque, contrasting inset background.

Usage-access help, notification rationale, and local JavaScript confirmation dialogs use Android's device-default dark/light dialog themes according to the current app preference. OS permission prompts and Settings keep their OS-owned appearance. Confirmation callbacks explicitly cancel on Back/outside dismissal and reject non-local page origins.

The native audit retained the existing `adjustResize` manifest setting, API 35+ IME/system-bar maximum inset, WebView `saveState`/`restoreState`, and focus restoration in web storage. Back traverses WebView history before returning through the Activity's existing SDK-35 Back path, with a null guard during teardown. No configuration-change suppression or orientation lock was added. Android 16 documentation confirms the removal of `onBackPressed` callbacks applies to apps targeting SDK 36+; this release stays at target 35. A future target-36 migration must adopt the platform Back dispatcher (the installed NavigationEvent skill is Compose-only and does not apply to this Java WebView shell).

Changed files: `MainActivity.java`, `WellnessBridge.java`, `build-apk.ps1`, and these native notes. Signing identity, manifest permissions, offline isolation, target SDK, and SDK installation remain unchanged. All native sources compile against Android platform 36 with JDK 24 / `--release 8`. Parent owns device testing and final APK packaging; no emulator state was changed by this work.

Official behavior reference checked 2026-11-18 through Android CLI: [Android 16 target behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16).

```diff
- native backgrounds: light #f8f8f3 / dark #141c19
+ native backgrounds: light #f7f8fa / dark #111318
+ device-default dialog theme follows app dark/light preference
+ native confirmation cancel handling and trusted local origin check
+ API-30 system-bar appearance and API-29 contrast-scrim control
- --version-code 7 --version-name 2.1
+ --version-code 8 --version-name 2.2
```

### Running the harness

Android Back first asks trusted local content to dismiss a visible comparison dialog via its existing close button, then an open `.app-more` menu (returning focus to its summary). With neither open it traverses WebView history / the Activity's standard Back path. The native callback guards rapid repeated Back dispatch and ignores stale results after navigation or Activity destruction. It does not intercept native permission dialogs or the keyboard's own Back handling. Parent runtime QA should check comparison focus/inert cleanup, More menu focus, ordinary history, and root exit on Android 16.

`mobile/tests` contains a separate test APK, never included in the release app. After the release build is authorized, run `powershell -NoProfile -ExecutionPolicy Bypass -File mobile/tests/build.ps1`, install `mobile/tests/build/harness.apk` alongside the target, and run `adb shell am instrument -w com.goodsignal.test/.BridgeHarness`. It starts the app and enables WebView debugging only in that test process for ten minutes. Stop the instrumentation to end the session. The harness must be signed with the same existing identity to instrument the target; do not distribute it. Test usage access and notification permission in both denied and granted states, check the notification channel, inspect delivered notifications and alarm scheduling/cancellation, and verify usage after opening another app.

To exercise the real reminder receiver without waiting for an inexact alarm, enable a reminder first, stop the first instrumentation session, then run `adb shell am instrument -w -e fireReminder true com.goodsignal.test/.BridgeHarness`. Inspect the reminder notification and the newly scheduled alarm; disable the reminder afterwards and confirm cancellation.
