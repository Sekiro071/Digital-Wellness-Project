# Good Signal Android 2.2 interface

## Direction contract

Mode: Operate. Students use the app to understand actual usage, complete a focus block, or check in with a habit. Every decision serves those tasks.

Thesis: A compact Android companion with clear information, familiar controls, and useful detail on demand. The final design replaces the former forest wash and promotional headlines.

Own world: Neutral white/light-grey surfaces (#f7f8fa / #ffffff) and graphite dark surfaces (#111318 / #1b1e25). Restrained accessible blue primary (#4c5fc8) and periwinkle dark primary (#a9b7ff) identify actions and selection. Amber marks reminder/recovery context; teal only marks success/check-ins. A system sans works offline and respects text scaling. Controls use 48px minimum heights, a 4/8px spacing rhythm, visible focus outlines, and 150–220ms state transitions. Seven chart days use a dense plot with full-height button targets; all remain keyboard accessible.

Story: Today immediately shows actual usage state and Focus/Habits shortcuts. The week chart and app rows expose useful detail. Explore begins with search and category tabs; device/price/saved filters are progressive. Focus shows task and duration before Start, with additional preferences collapsed. Habits present the current checklist before adding more. Sleep settings open only when needed.

First viewport: One consistent app bar with the Good Signal mark, accessible theme icon, and More menu. A short route heading introduces the task. No marketing hero or repeating strapline. The primary work area begins immediately.

Form: Five standard phone navigation destinations: Today, Explore, Focus, Habits, Guides. A rail serves larger windows. A narrow selected indicator replaces large filled tab panels. Signature interaction: a selected actual day highlights its usage bar and announces its recorded total; app rows remain explicitly scoped to today. Seed: none (pinned by the user's neutral/periwinkle direction and inspected Android template references).

Finish: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Template references and provenance

Repository: https://github.com/wsdesignuiux/Android-ui-templates
Inspected commit: c7c88310822a1b90fae1b1102cb8a37c1e8f31a0
Checked: 18 November 2026. Local reference checkout: tmp/android-ui-templates.

Actually inspected previews:
- images/cryptostar_ui_kit.png: compact neutral stats, readable lists, restrained selected navigation.
- images/onlin_app_store_ui_kit.JPG: search-first directory, categories close to results.
- images/team_schedule_ui_kit.jpg: concise status rows and practical action placement.
- images/clean_menu_ui_kit.jpg: labelled secondary destinations.
- images/online _course_ui_kit.png: reading/list hierarchy.

The repository is a catalogue of README links and preview images under an Apache-2.0 repository license, not a complete native source project. Good Signal adapts general composition patterns. No preview imagery, third-party template code, paid downloads, financial data, user portraits, or unrelated product copy is bundled. No shipping raster assets were added by this redesign. Android controls and navigation remain appropriate to this app rather than copying the iOS device frames in some previews.

## Preserved behavior and privacy

- No fabricated usage, completions, streaks, or app logos. App names use honest initial badges where native icons are unavailable.
- Day selection changes the selected historical label; today's summary and app breakdown remain today-only. Zero usage draws no positive-height bar.
- Usage access is optional and user driven. Conditional restricted-settings help links official Android support; App info opens only after a tap. Recheck reads current native permission, never grants it. Focus, Habits and Guides work without usage permission.
- ready, needs_access, locked and unavailable native states have appropriate recovery. Locked/error data never becomes a zero total.
- Theme controls preserve their existing listeners and synchronize native bars on all routes, including restored pages. Sun means switch to light; moon means switch to dark. The accessible button name states the exact action.
- More closes on outside press/Escape and restores focus. Secondary destinations remain available without crowding the five main tabs.
- Search/category/progressive filters reuse original form elements and listeners. Their values match the actual resource category options. Original comparison/save behavior remains intact.
- Focus task/duration/break controls retain their original elements and event handlers after relocation. A presentation observer derives paused/running headings and Resume styling from existing controls without changing timer logic or persistence.
- Existing habit storage keys remain unchanged. Inline editing has Save, Cancel, validation and focus restoration. Suggested habits cannot duplicate an existing suggestion. History selection inspects saved check-ins without modifying them.
- Existing reminder schedule/permission bridge and dirty form preservation remain. The collapsed summary reflects the saved native reminder.
- Motion only conveys press, selection and habit completion. Reduced motion disables it. Keyboard viewport changes preserve form space.

## Validation and review

Automated validation: all 39 checks pass (31 frontend and 8 focus-restoration tests). Coverage includes original resources, filters, comparison, focus timing, reminders, storage and local midnight behavior; restricted-settings recovery; error/locked states; chart selection/app expansion; native theme propagation; habit suggestions/history; More menu outside/Escape; exact category chip values and result counts; original Focus listeners after relocation including pause/resume presentation; inline habit save/cancel/validation/focus; active/paused timer restoration, reset and deduplicated completion records.

Final rendered review: parent captured and visually accepted output/android-2.2-qa/{today,explore,focus,habits,guides}-{light,dark}.png from the exact final signed build installed on Android 16 / API 36 emulator 5566. Corrected category/icon contrast, sun action in dark mode, restored Paused heading and blue Resume treatment were verified after rebuilding. Native bar backgrounds match #111318 / #f7f8fa. The UI uses code-native marks; no shipping raster assets were introduced.

Parent runtime checks: all five routes had no horizontal/header overflow at 320×720, 720×360 landscape and 820×1180 tablet metrics. Actual 800dp tablet configuration rendered the rail without overflow (tablet-light.png). Actual Android font scale 1.5 yielded a 24px root and no overflow on all five routes. The software keyboard kept the habit form/Add visible and hid bottom navigation; habit-keyboard-visible.png records that test before the final minor patch. Reduced motion produced 0s button transitions. More closes with Android Back and focuses Summary; comparison Back closes and clears inert; category counts are 2/3/2/3/10; inline habit edits persist. No AndroidRuntime errors were observed. Instrumentation was stopped, normal app launched, and font/window/keyboard-test settings restored.

Artifact acceptance: version 8 / 2.2, SHA-256 B949108122E7EE6FB81AAA4FF68C2A69D3066D9A94635B1C73D463B038F41717, matches installed base.apk. Existing-certificate v2/v3 signatures verified; all 38 bundled WWW files match byte for byte and use POSIX archive paths. Offline checks ran in airplane mode; the APK has no INTERNET permission.

Verdict: **accepted for final delivery** against the documented emulator and render criteria. Full evidence and screenshot provenance are in [Android 2.2 QA](../output/android-2.2-qa/QA.md). Physical-phone testing, the exact OEM restricted-settings approval menu, overnight Doze reminder timing, and full TalkBack certification remain outside this acceptance. No new reminder-delivery result is claimed for 2.2; the unchanged reminder implementation retains earlier 2.1 notification-test evidence. Template patterns were adapted, not copied as source or preview imagery. Earlier QA records remain intact.
