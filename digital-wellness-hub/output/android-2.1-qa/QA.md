# Good Signal 2.1 Android release verification

Date: 18 November 2026 (Asia/Calcutta)
Package: com.goodsignal.app, versionCode 7, versionName 2.1
APK: ../Good_Signal.apk
SHA-256: 96E507F8349C9A536AA3C08FFA8BDCDB3EE75EB265109200CD056B86E2EDE01B

## Permission issue
The user reported Android 16's personal/financial information warning and the official restricted-settings support link. This is Android's restricted-settings protection for an installed APK. The app cannot grant or bypass it. Added visible recovery steps, an Open app info button, targeted app-specific Usage access, and Check access again. The user must approve restricted settings in Android App info if offered, then enable Usage access. Work/school policies may prevent approval.
Official guidance checked: https://support.google.com/android/answer/12623953 (18 November 2026).

## Completed checks
- 22 existing frontend tests and 8 focus restoration tests passed.
- Built with direct SDK/JDK tools; no Android Studio required. Existing signing certificate retained; APK v2/v3 signature verification passed.
- Installed and tested on Android 16 / API 36 x86_64 emulator, serial emulator-5566.
- Usage permission initially off: honest missing-data state and recovery instructions visible. Open app info reached Good Signal's app-info screen.
- Connect screen time reached Good Signal's own Usage access page. Toggled permission through the actual Settings switch; app returned to usageStatus ready and showed real usage. No shell grant used for this Android 16 test.
- Dark and light interfaces inspected; system-bar appearance follows theme.
- All five main routes rendered without horizontal overflow at 320x720, 720x360 and 820x1180 via WebView viewport checks. Expanded layout uses navigation rail.
- Android font_scale 1.5 produced a 24px root font, confirming scaling. All five routes had no horizontal overflow. Restored font_scale 1.0.
- Added and checked a habit, reloaded, verified name and completion persisted.
- Selected a chart day and saved a daily screen-time intention successfully.
- Started a real focus block, visited Habits and returned; task and running countdown restored. Paused block retained its remaining time. Automated tests cover paused state, completion deduplication, corrupted storage, discard and blocked storage.
- Granted notifications through Android's actual permission dialog. Saved daily wind-down at 22:15; native preferences reflected it. Test notification id 101 appeared in Android NotificationManager. Disabled the test reminder afterward.
- Airplane mode on, Wi-Fi and mobile data off: resource search returned 2 Android matches, two-resource comparison opened with 9 rows, resource detail loaded.
- All three setup guides loaded offline with 5, 5 and 9 steps respectively. Every guide screenshot loaded with a nonzero natural width.

## Evidence and limits
Screenshots in this directory were captured from the Android 16 emulator/WebView. Screenshots are QA data, not fabricated student feedback.
A sideload via ADB did not reproduce the phone's restricted-settings warning. The recovery path and normal grant were tested; the exact OEM warning and its approval menu still need confirmation on the user's phone.
Physical phone gestures, overnight reminder delivery, Doze and manufacturer battery restrictions are not verified. Android schedules these reminders approximately. Usage estimates can differ from Digital Wellbeing.
The app remains a native Android shell around offline web screens; no full Jetpack Compose migration was attempted. No promise of perfection or full accessibility certification is made.
