# Accessibility review record

Date updated: 17 November 2026

This is a record of implemented patterns and checks actually completed. A checked implementation item is not a claim of WCAG conformance.

| Area | Implemented or automated evidence | Manual status |
|---|---|---|
| Structure | Semantic landmarks/headings, skip links, labelled controls; covered by source and DOM checks | Keyboard traversal across every route not independently completed |
| Keyboard | Visible focus styles; comparison dialog opens with focus, closes with Escape, makes background inert, and restores focus in DOM tests | Full end-to-end keyboard-only pass pending |
| Forms | Labels, inline field errors, status feedback, duplicate-submit handling covered by DOM tests | Screen-reader announcement quality not tested |
| Contrast and themes | Parent browser audit covered 22 routes in both themes at 390px and 1440px; selected screenshots were visually reviewed | Computed colors are not a full contrast audit; not all states were manually reviewed |
| Responsive behavior | 22 routes checked at 390px and 1440px in both themes; 12 guide browser checks recorded; comparison dialog scrolls internally at mobile width | Physical phone and 200% zoom checks pending |
| Motion | Reduced-motion styles are implemented | Reduced-motion behavior not independently inspected in a rendered browser in this review |
| Images | Current QA screenshots depict the Good Signal website itself | Guides include credited provider reference images; they are not evidence of a project device walkthrough |
| Assistive technology | — | Screen reader, high contrast mode, voice control, and switch access not tested |

## Visual evidence reviewed

- Sol's `output/sol-theme-checks` captures include home, Explore, Focus, and compare views in light and dark themes at desktop and phone widths. The parent reported review of Explore desktop light and mobile dark, Focus desktop light, and mobile comparison dark; mobile comparison uses internal horizontal scrolling.
- This review visually inspected Explore desktop light, Explore mobile dark, mobile comparison dark, and Focus desktop light. No apparent text collision or unintended overflow was visible in those captures; the comparison table intentionally scrolls within its dialog.
- See `QA_REPORT.md` for exact route/width/theme scope and current parent verification state.
