# Web app completion plan

## Goal and scope
Complete Good Signal as a local FastAPI digital wellness hub for students. Keep the existing resources, three setup guides, recommendation flow, anonymous feedback, and private focus session. Android packaging is a later task. No deployment is required in this phase.

## Work streams and acceptance criteria

1. **Directory and comparison — Terra:** correct resource-card layout, live search, combined category/device/price filters, clear filters, working saved-only view, resilient browser storage, three-item comparison, predictable modal state, Escape/backdrop dismissal and keyboard focus management.
2. **Recommendations and feedback — Terra:** apply goal/device/budget constraints before ranking; explain empty results; expose all supported platforms; keep submitted text when feedback fails; prevent duplicate submission and explain validation errors.
3. **Focus sessions — Luna:** deadline-based timekeeping; accurate pause/resume; consistent early finish; stable task and duration during a block; local-day statistics; safe handling of malformed storage; accessible announcements and deliberate history clearing.
4. **Backend — Terra:** allow only intended public files; validate feedback; preserve records under concurrent writes; escape generated HTML; usable resource pages and 404s; regression tests with isolated temporary storage.
5. **UI and content — main agent:** repair HTML/CSS contracts, readable body type, responsive navigation/filter/cards, clear button states, visible keyboard focus, narrow-screen comparison scrolling, consistent backend links and accurate About/privacy copy. Preserve the agreed ink/chartreuse identity.
6. **Verification and handoff — main agent:** exercise navigation, filter/save/compare, recommendations, focus and feedback; record actual results, limits and commands; provide a reproducible start command and source files.

## Submission evidence
The supplied requirements also call for a website link, source links and check dates, resource comparison, three guides, link test record, accessibility checklist, anonymized user feedback, revisions, report and presentation. Record only observed checks. Real student feedback, presentation screenshots from real devices, and a published public URL cannot be invented; distinguish these remaining submission activities from implemented app features.

## Verification approach
Use backend request tests for routing, private-file protection, resource details and feedback; JavaScript syntax checks plus behavior checks for interactive state; inspect rendered pages through the available browser/Windows tools. Test narrow and wide layouts where available. Do not claim unperformed screen-reader, physical Android or third-party product verification.

## Completion record
Implementation streams 1–5 are complete. Stream 6 passed automated backend, link and DOM behavior checks; rendered browser/device inspection remains open because computer control was blocked by URL verification. See QA_REPORT.md for observed outcomes and SUBMISSION_CHECKLIST.md for evidence that must come from actual student testing and publication.
