# Good Signal QA report

Date: 17 November 2026. Scope: shared workspace release after Sol/Terra integration. No real student submissions or participant results were used.

## Final automated results

- Frontend: **12/12 passed** (parent integration run).
- Backend: **9/9 passed** (parent integration run).
- Routing: **21 page responses returned successfully**.
- Internal links: **40 distinct destinations, assets, and fragments verified** after guide image integration.
- External URLs: **23/23 passed on 17 November 2026**, recorded in `evidence/SOURCE_LINKS.md` and `evidence/source_link_record.json`.
- Resource comparison CSV/Markdown: generated from canonical `data/resources.json`; 10 resources with purpose, platforms, pricing, privacy, accessibility, limitations, sources, and checked dates.

## Browser and visual review

- Parent browser audit: **22 routes x 2 widths x 2 themes**. Parent reports no horizontal overflow and theme surfaces changed as expected. Parent reviewed home, Explore, Focus, and comparison screenshots in both themes; the mobile comparison table scrolls inside its dialog.
- The report/deck include genuine Good Signal interface captures from `output/sol-theme-checks/` and provider-published reference images in `assets/guides/`. Provider images are clearly distinguished from device testing.
- Final guide pages now embed official Android, Apple, and StayFocusd reference screenshots with alt text and credits. The three guide pages passed **12 browser checks** across two widths and two themes; see `output/guide-reference-checks/results.json`.
- A machine browser rendering does not replace a physical Android/iPhone walkthrough.

## External source check

`tools/check_external_links.py --write` checks unique HTTP(S) external hrefs on public HTML pages, URL-valued source/install/store/privacy/pricing fields in resource data, and the final guide image source inventory. It writes a dated per-URL record with HTTP status or request error, final URL, and referring files. A successful response confirms availability at that time only; it does not verify product claims, price, compatibility, or privacy practices.

## Accessibility review

Semantic landmarks/headings, skip links, labelled fields, visible focus, reduced-motion styling, status messages, and managed comparison-dialog focus are implemented and partially covered by DOM tests. See `evidence/ACCESSIBILITY_CHECKLIST.md` for the reviewed theme/viewport coverage and unverified checks. Screen-reader testing, complete keyboard-only traversal, 200% zoom, high contrast mode, and physical phone checks are not claimed. This is not a WCAG conformance statement.

## Guide and image evidence

The three setup guides use concise steps with expected outcomes, troubleshooting, and official sources. The StayFocusd page now warns that its Nuclear Option cannot be canceled once active, tells first-time users to avoid it, and does not promise pause, allowlist, or undo controls for an active block. Official reference screenshots are attributed in the guide pages and `assets/guides/SOURCES.md`; they illustrate provider interfaces but were not captured during device testing for this project.

## Student feedback and release limits

- Real student testing is **pending**. The blank anonymized task log is `evidence/USER_TESTING_TEMPLATE.csv`. Conduct 3–5 sessions, record observed tasks and hesitations, make evidence-based changes, and retest. Do not fill it with assumed or invented results.
- A teacher-accessible public website URL is **pending**. The local server URL only works on the computer running it.
- Recheck product facts and source pages at the date of publication.
- Android APK packaging is outside this web-app phase.

## Revisions recorded

| Issue | Revision |
|---|---|
| Comparison overlay blocked Explore | Explicit hidden state, stable open/close behavior, Escape handling, and focus restoration |
| Directory entries became narrow text columns | Stable vertical resource layout and action placement |
| Save filter and button labels regressed | Functional saved-only view, stable text labels, pressed states, storage fallback |
| Quiz truncated matches before applying constraints | Goal/platform/budget constraints applied before ranking and limiting |
| Mac/macOS matching differed | Equivalent platform matching |
| Timer drift and state transitions | Deadline-based timing and stable pause/resume/break transitions |
| Early finish fabricated a minute | Elapsed seconds retained; minutes reflect actual duration |
| Feedback overwrote concurrent records | SQLite transactions, field validation, and duplicate-submit blocking |
| Arbitrary project files were served | Allowlisted public routes/assets and private feedback storage |
| StayFocusd guide implied a reversible block | Removed unsupported pause/allowlist advice; added the current non-cancelable Nuclear Option warning |
| Setup steps were too generic | Rewrote Android and iPhone paths around official source instructions and added provider reference images |
