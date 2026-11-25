# Android wellness QA

The final signed build is version 6 / 2.0, with SHA-256 `B63AB6587BDCE9C1E0FB6CC1AD70FF2144D713E67A79EE04C521516B24DBD340`. The final UI test suite passed 22 of 22 tests.

The final build was installed on the Android 15 emulator, and the installed `base.apk` SHA-256 matched the release hash above. With airplane mode enabled, the root dashboard rendered real native app statistics and showed no horizontal overflow. All 38 bundled WWW files matched their generated sources byte for byte, and all ZIP entry names used POSIX separators. Test instrumentation was stopped and the normal activity was launched.

The additional emulator checks and screenshots below were recorded on an earlier build, with airplane mode enabled and Wi-Fi and mobile data disabled. That build matched the APK installed on the emulator at the time; those screenshots and results do not independently verify the final build.

- The earlier UI test suite passed 21 of 21 tests.
- Notification permission was requested from the UI using the Android permission prompt; after Allow, the app reported notifications granted. The real usage-access flow produced a today total of 3,310,330 ms, an app list, and seven daily entries.
- Saving a 22:30 sleep reminder in the UI matched the native preference. The test-notification button produced Android notification ID 101. Turning the reminder off in the UI set its native enabled preference to false.
- In an earlier test, invoking the real reminder receiver produced notification ID 100, “Time to wind down,” and scheduled the next inexact daily alarm. This was a forced receiver test, not an overnight timing test.
- Habits could be created, checked, edited, and persisted; checkbox focus was restored. Today, Habits, Focus, and Explore showed no horizontal overflow at 320-pixel portrait and 720-pixel landscape widths.

The screenshots in this folder record the earlier tested emulator UI and notifications. A physical phone, overnight delivery, and behavior during Doze remain unverified.
