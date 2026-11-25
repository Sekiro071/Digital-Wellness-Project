# Good Signal visual system

Good Signal is a sharp, practical study surface rather than a soft wellness dashboard.

- Deep ink panels carry moments that demand attention; cool blue-grey surfaces keep source-heavy pages comfortable for longer study.
- Electric signal green means the next useful action. Coral is reserved for interruption or feedback. Borders, not floating shadows, create structure.
- Bricolage Grotesque provides expressive hierarchy; Public Sans keeps guidance readable; IBM Plex Mono is used only for measured values and small labels.
- Components use clear 1px lines, compact corners, dense directories, and full-bleed dark task panels.
- The focus session is the signature surface: its large time display and horizontal progress rail make one study block the page's primary object.

## Component decisions

Directory entries use vertical flex layout: icon/pricing, title, purpose, platforms, fit/privacy notes, then actions. Text-heavy entries must never inherit the result-card two-column layout. SVG symbols share a 1.7px stroke. Save/Compare controls use text and pressed state. Modal visibility uses the native hidden attribute, with inert background and focus restoration.

The homepage study panel explains a real workflow rather than displaying fabricated activity. Reading text uses approximately 15–16px across resources/guides; compact controls have a 44px minimum target. Comparison tables scroll inside the dialog at narrow widths. Token aliases support older guide markup.

Visual QA remains required at the documented viewport sizes; automated DOM checks do not verify rendered spacing or contrast.
