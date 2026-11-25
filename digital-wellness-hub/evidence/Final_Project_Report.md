# Good Signal: Digital Wellness Resource Hub

**Project report**  
Prepared 17 November 2026

## Project purpose

Good Signal is designed for college and university students, roughly ages 18–24, who are balancing study, social life, sleep, and multiple devices. It is a student-oriented web hub for understanding common digital wellness options and choosing a next step. It combines resource discovery, a rules-based recommendation flow, three setup guides, digital safety information, a private focus timer, and a feedback form.

The initial needs—phone use, study distraction, notifications, sleep, and concern about tracking—are design assumptions drawn from the project brief and current product scope. They have not yet been confirmed through student interviews or usability testing.

The project is an informational aid, not a clinical tool or a guarantee that a person will reduce screen time. Product features, pricing, permissions, platform support, and privacy statements can change; readers should check each official source before installing or relying on a product.

## How the hub works

- **Explore resources:** search and filter ten built-in, app, browser, and privacy resources by topic, device, and pricing label. Save items locally and compare up to three.
- **Find a tool:** choose a goal, platform, and budget to get matches. Hard requirements are applied before ranking.
- **Set up a change:** follow short Android Digital Wellbeing, StayFocusd, or Focus / Do Not Disturb instructions with expected results and troubleshooting.
- **Start a study block:** use a 25, 45, or 60 minute timer, pause or resume, log distraction check-ins, take a break, and review local session history.
- **Learn and respond:** read digital safety and method notes, or submit optional feedback.

A standalone comparison table is provided at `evidence/RESOURCE_COMPARISON.csv`, generated directly from the canonical resource data. It includes purpose, platform, cost, privacy, accessibility, limitations, official source and check date.

## Design and privacy choices

The visual system uses deep blue ink, pale blue surfaces, and bright signal green to distinguish the main action. Light and dark themes are available. The directory uses text-led cards and a comparison dialog with an internally scrollable table at narrow widths.

Focus tasks and session history stay in the browser unless the user clears site data. Resource saves are stored locally. The feedback endpoint stores the submitted form fields in a local SQLite database; the free-text field could contain identifying details if a participant types them. This demonstration has no authentication, spam protection, or hosted deployment configuration. Do not collect names or contact details for the class usability exercise.

## Verification completed

| Check | Result | Scope |
|---|---:|---|
| Frontend behavior | 12/12 passed | Parent integration run; DOM behavior checks for resource actions, recommendations, focus, feedback, and navigation |
| Backend and link tests | 9/9 passed | Parent integration run |
| Public routes | 21 page responses | All returned successfully in the parent run |
| Internal destinations | 40 targets/assets/fragments | Parent final link test after guide image integration |
| External source/install links | 23/23 returned HTTP success | Dated 17 Nov 2026; includes public HTML links, canonical resource source/install links, and guide image source pages |
| Browser theme/layout | 22 routes x 2 widths x 2 themes | Parent browser audit reported no horizontal overflow and correct theme surfaces; screenshots were reviewed for home, Explore, Focus, and comparison in both themes |
| Guide image browser check | 12/12 checks passed | Three guides x 390/1440 widths x light/dark themes; images loaded at the correct proportions, alt text and full-size links were present, no overflow |

The source link inventory and complete per-URL status/final URL record are in `evidence/SOURCE_LINKS.md` and `evidence/source_link_record.json`. These checks confirm availability at the recorded time; they do not validate product claims or prove privacy practices. Guide rendering evidence is in `output/guide-reference-checks/results.json` with the 12 saved screenshots.

## Guide illustrations

Guide pages use official reference illustrations/screenshots sourced from Google Play, Apple Support, and the StayFocusd Chrome Web Store listing. They are credited at their point of use and in `assets/guides/SOURCES.md`. These are provider reference images, not screenshots captured during testing on a Good Signal reviewer's device. Device menus and versions can differ. No Android phone or iPhone was available for a device-specific walkthrough.

The StayFocusd guide reflects a current Chrome Web Store listing that describes the Nuclear Option as not cancelable once active and also describes a Require Challenge control. The guide tells first-time users to avoid the Nuclear Option and does not promise pause, allowlist, or undo controls for an active block.

## Student review and revisions

Automated checks are not student usability testing. No student participants, observed task outcomes, quotations, or feedback-driven revisions are claimed in this report. A blank, anonymized recording template is provided at `evidence/USER_TESTING_TEMPLATE.csv`.

Before submission, invite 3–5 students to try four tasks: find a suitable resource, compare two options, follow a setup guide, and start/pause/finish a study block. Use participant codes, obtain consent, avoid collecting names or browsing history, record only observed behavior, make a change when evidence supports it, and retest that task. Leave the feedback and revision fields blank until the sessions happen.

## Accessibility and review limits

Implemented patterns include semantic landmarks and headings, skip links, labelled fields, visible keyboard focus, reduced-motion styles, status messaging, and a keyboard-managed comparison dialog. Browser screenshots and DOM tests support parts of this review. The separate checklist records exactly what was and was not manually checked.

Screen-reader testing, complete keyboard traversal across every route, 200% zoom, high contrast mode, and a physical phone were not verified. The project does not claim WCAG conformance.

## Submission status

- **Website:** local demo only. No public teacher-accessible URL exists yet; `http://127.0.0.1:8000` works only on the host running the server.
- **Report and presentation:** `output/pdf/Good_Signal_Project_Report.pdf` (5 pages) and `output/presentation/Good_Signal_Project_Presentation_Final.pptx` (8 slides) are editable/submission artifacts, not evidence of student testing.
- **Sources and link checks:** dated and recorded; recheck before publishing.
- **Setup guides:** three concise guides and provider reference illustrations are included; device-specific testing remains pending.
- **Student review:** pending 3–5 real participants, observed notes, revisions, and retests.
- **Future scope:** public hosting and Android APK packaging are not completed in this web-app phase.

## Main sources

- [Android Help: Digital Wellbeing](https://support.google.com/android/answer/9346420?hl=en)
- [Android Help: Modes and Do Not Disturb](https://support.google.com/android/answer/9069335?hl=en)
- [Apple Support: Do Not Disturb on iPhone](https://support.apple.com/en-us/105112)
- [Apple Support: Screen Time](https://support.apple.com/en-us/108806)
- [StayFocusd official site](https://www.stayfocusd.com/)
- [StayFocusd Chrome Web Store listing](https://chromewebstore.google.com/detail/stayfocusd-%E2%80%93-website-bloc/laankejkbhbdhmipfmgcngdelahlfoji)
