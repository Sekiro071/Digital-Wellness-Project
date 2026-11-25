# Good Signal Android 2.2 release QA

Checked: 18 November 2026. Verdict: accepted for delivery based on the final signed APK and Android 16 emulator checks. Physical-device and OEM-specific limits are listed below. This record documents the parent orchestrator's reported final validation; no code changes or rebuild were performed while writing it.

## Artifact identity

- Release: `output/Good_Signal.apk`, version name **2.2**, version code **8**.
- SHA-256: `B949108122E7EE6FB81AAA4FF68C2A69D3066D9A94635B1C73D463B038F41717`.
- Installed `base.apk` on Android 16 / API 36 emulator `emulator-5566` matched this hash.
- APK v2 and v3 signatures verified with the existing signing certificate. Update identity was retained.
- All **38** bundled WWW files matched their generated sources byte for byte; archive paths use POSIX separators.
- Airplane mode was enabled (`1`), and the APK declares no INTERNET permission. Core offline flows remained available.

## Automated validation

**39 passed, 0 failed:** 31 frontend checks plus 8 focus-restoration checks.

Frontend coverage includes resource filtering and comparison, permission/error states, theme propagation, habit editing and check-ins, reminder form behavior, accessible menu behavior, and focus controls. Restoration checks cover absolute-deadline recovery, frozen paused sessions, deduplicated completion history, break restoration, reset/discard, malformed and blocked storage, and back-forward cache handling.

## Final render acceptance

The ten route/theme screenshots in this directory capture the exact final installed build:

| Route | Light | Dark |
| --- | --- | --- |
| Today | [today-light.png](today-light.png) | [today-dark.png](today-dark.png) |
| Explore | [explore-light.png](explore-light.png) | [explore-dark.png](explore-dark.png) |
| Focus | [focus-light.png](focus-light.png) | [focus-dark.png](focus-dark.png) |
| Habits | [habits-light.png](habits-light.png) | [habits-dark.png](habits-dark.png) |
| Guides | [guides-light.png](guides-light.png) | [guides-dark.png](guides-dark.png) |

Final corrections were visually accepted: dark mode shows the sun action for switching to light, icon contrast is readable, and a restored paused session displays the Paused heading with a blue Resume action. Native bar/inset backgrounds synchronize to dark `#111318` and light `#f7f8fa`.

All five routes had no horizontal document or header overflow at WebView metrics **320×720**, **720×360**, and **820×1180**. A real `wm` tablet configuration at 800dp was also checked: [tablet-light.png](tablet-light.png) shows the navigation rail without overflow.

With actual Android `font_scale=1.5`, the root text size was 24px and all five routes remained free of horizontal overflow. Reduced-motion inspection reported button transition duration `0s`.

The real software keyboard kept the habit form and Add action visible while hiding the bottom navigation. [habit-keyboard-visible.png](habit-keyboard-visible.png) records that check **before the last minor patch**, so it is supporting keyboard evidence rather than an exact-final-build screenshot. [large-text-keyboard.png](large-text-keyboard.png) is additional supporting evidence; the ten route/theme images above are the exact-final-build render record.

## Functional device checks

- Android Back dismissed More and returned focus to its summary before attempting page navigation.
- Android Back closed comparison through its existing close action and cleared the background's inert state.
- Explore category-chip result counts were **2 / 3 / 2 / 3 / 10** for the tested sequence.
- Inline habit Save persisted the edited name.
- Native theme synchronization and the final focus pause/resume presentation were inspected.
- No AndroidRuntime errors were observed during the recorded checks.
- Test instrumentation was stopped and the normal app was started after QA.
- Environment restored: font scale `1.0`, window size and density reset, keyboard-test setting `0`, night mode `no`. Airplane mode remained enabled for offline verification.

## Scope and limitations

- The Android 16 warning about personal and financial information was identified as the OS restricted-settings protection. The app provides conditional, user-driven App info / Usage access recovery and does not bypass safeguards. The exact OEM restricted-settings menu and approval sequence were **not** reproduced on the user's physical phone.
- This turn did **not** retest real reminder delivery. Earlier 2.1 validation recorded a real notification test; `Reminders` was unchanged. That earlier result is not a new 2.2 delivery test. Overnight timing, Doze and manufacturer battery restrictions remain unverified.
- No physical-device certification or full TalkBack accessibility certification is claimed. Text scaling, focus restoration, contrast, reduced motion and layout checks are evidence of the specific behavior tested.
- Focus persistence depends on available local storage and the device wall clock. No background focus-completion notification was added.
- The Android UI template catalogue informed composition patterns. Preview assets and third-party template source were not copied into the app.
- Earlier QA evidence, including the prior 2.1 record, remains intact and should be read with its own version and test scope.

Release acceptance is limited to the verified artifact, emulator journeys and documented checks above; it does not imply every Android device or accessibility configuration has been certified.
