"""Build the concise evidence-led Good Signal project report PDF."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Good_Signal_Project_Report.pdf"
INK = colors.HexColor("#102836")
MUTED = colors.HexColor("#496371")
LIME = colors.HexColor("#d4ff35")
PALE = colors.HexColor("#eaf0f4")
LINE = colors.HexColor("#b8cbd4")
WHITE = colors.white

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleGS", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=INK, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="SubGS", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=17, textColor=MUTED, spaceAfter=9))
styles.add(ParagraphStyle(name="H1GS", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=INK, spaceBefore=2, spaceAfter=9))
styles.add(ParagraphStyle(name="H2GS", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=INK, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyGS", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="SmallGS", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="CellGS", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.2, leading=10.5, textColor=INK, spaceAfter=0))
styles.add(ParagraphStyle(name="CellHeadGS", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.2, leading=10.5, textColor=INK, spaceAfter=0))


def P(text, style="BodyGS"):
    return Paragraph(text, styles[style])


def bullet(label, text):
    return P(f"<font color='#64808e'>•</font> <b>{label}</b> {text}")


def table(rows, widths, header=True):
    data = [[P(str(c), "CellHeadGS" if header and i == 0 else "CellGS") for c in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE if header else WHITE),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def shot(name, width, caption):
    path = ROOT / name
    if not path.exists():
        return P(f"<b>Screenshot pending:</b> {caption}", "SmallGS")
    im = Image(str(path))
    im._restrictSize(width, 74 * mm)
    return KeepTogether([im, Spacer(1, 2 * mm), P(caption, "SmallGS")])


def shot_cell(name, width, caption, max_height=72 * mm):
    path = ROOT / name
    if not path.exists():
        return P(f"Screenshot pending: {caption}", "SmallGS")
    im = Image(str(path))
    im._restrictSize(width, max_height)
    return [im, Spacer(1, 1.5 * mm), P(caption, "SmallGS")]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "GOOD SIGNAL  /  PROJECT REPORT  /  17 NOV 2026")
    canvas.drawRightString(192 * mm, 9 * mm, str(doc.page))
    canvas.restoreState()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="Good Signal Project Report", author="Good Signal project team")
    story = []
    story += [P("GOOD SIGNAL  /  PROJECT REPORT", "SmallGS"), P("Digital wellness,\nwith room to choose.", "TitleGS"), P("A student resource hub for comparing tools, setting a small study boundary, and checking official sources.", "SubGS"), P("17 November 2026  ·  Local FastAPI web app", "SmallGS"), Spacer(1, 8 * mm)]
    story += [P("Audience and purpose", "H1GS"), P("The intended audience is college and university students, roughly ages 18–24. Good Signal brings practical digital wellness resources into one place and helps students choose a next step they can inspect and decide whether to use.")]
    story += [P("Initial needs are assumptions", "H2GS"), P("Phone use, study distraction, notifications, sleep, and concern about tracking are design assumptions from the brief and product scope. They are not findings from student interviews or usability testing; validate them with real students before making audience claims.")]
    flow = table([["EXPLORE", "CHOOSE", "TRY", "REVIEW"], ["Search, filter, save, compare", "Match goal, platform, budget", "Read guides or start a focus block", "Check sources and share feedback"]], [43.5 * mm] * 4)
    story += [flow, Spacer(1, 6 * mm), P("A practical boundary", "H2GS"), P("The hub is informational, not clinical advice. Product claims, prices, permissions, and platform support change. Students should check current official sources before installing or relying on a tool.")]
    story.append(PageBreak())

    story += [P("What students can do", "H1GS"), P("The app keeps the choice in the student's hands: compare trade-offs, start with a reversible setting, and adjust when a tool does not fit.")]
    rows = [["Area", "What it offers", "Where it stores data"],
            ["Resource directory", "10 resources; search, category/device/price filters; save locally; compare up to 3.", "Saved list in this browser."],
            ["Recommendation flow", "Rule-based matches from goal, platform, and budget.", "Selections are used for the page result."],
            ["Focus session", "25/45/60-minute timer, pause/resume, check-ins, breaks, local history.", "Task and history stay in the browser until site data is cleared."],
            ["Guides", "Android Digital Wellbeing, StayFocusd, Android Do Not Disturb, and iPhone Focus paths.", "No account required."],
            ["Feedback", "Optional ease, usefulness, guide rating, and free text.", "Local SQLite endpoint; free text can identify someone if they include details."]]
    story += [table(rows, [34 * mm, 94 * mm, 46 * mm]), Spacer(1, 5 * mm), P("Design", "H2GS"), P("Deep blue ink, pale blue reading surfaces, and signal green for the main action make the interface feel focused without turning the directory into a generic dashboard. A light/dark theme switch is available. On a phone, the comparison table scrolls inside its dialog so the page itself stays in place.")]
    proof_shots = Table([[
        shot_cell("output/sol-theme-checks/explore-1440-light.png", 82 * mm, "Good Signal Explore · desktop · light theme"),
        shot_cell("output/sol-theme-checks/compare-dark.png", 82 * mm, "Good Signal comparison · mobile · dark theme; table scrolls inside the dialog."),
    ]], colWidths=[86 * mm, 86 * mm], hAlign="LEFT")
    proof_shots.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    story += [proof_shots]
    story.append(PageBreak())

    story += [P("Verification and evidence", "H1GS"), P("The final integration checks cover core routes and behavior. Visual checks were run in two themes and two viewport widths across 22 routes.")]
    result_rows = [["Check", "Observed result"], ["Frontend behavior", "12/12 tests passed."], ["Backend tests", "9/9 tests passed."], ["Routes", "21 page responses returned successfully."], ["Internal links", "40 distinct destinations/assets/fragments verified after guide image integration."], ["External links", "23/23 URLs returned successful HTTP responses on 17 Nov 2026; see evidence/SOURCE_LINKS.md."], ["Browser audit", "22 routes x 2 widths x 2 themes; no overflow reported. Guide pages separately passed 12 Edge checks: 3 guides x 2 widths x 2 themes, including image load, proportions, alt text, full-size rendering, and overflow. See output/guide-reference-checks/results.json."]]
    story += [table(result_rows, [42 * mm, 132 * mm]), Spacer(1, 5 * mm), P("Theme screenshots", "H2GS")]
    # Pair evidence images on this page to avoid a caption or screenshot orphan.
    verification_shots = Table([[
        shot_cell("output/sol-theme-checks/home-390-dark.png", 63 * mm, "Home · 390px · dark theme", 48 * mm),
        shot_cell("output/sol-theme-checks/focus-1440-light.png", 63 * mm, "Focus session · desktop · light theme", 48 * mm),
    ]], colWidths=[86 * mm, 86 * mm], hAlign="LEFT")
    verification_shots.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    story += [verification_shots, P("Guide browser evidence: output/guide-reference-checks/results.json and 12 saved screenshots.", "SmallGS")]
    story.append(PageBreak())

    story += [P("Guides and official references", "H1GS"), P("Setup illustrations are sourced from the providers' public help or product pages and credited where used. They show official reference interfaces; they are not device screenshots captured during this project's own testing. Menus and versions may differ. No Android phone or iPhone was available for a device-specific walkthrough.")]
    guide_images = [
        ("assets/guides/android-app-timer-official.png", "Android · Google Play reference", "https://play.google.com/store/apps/details?id=com.google.android.apps.wellbeing&hl=en"),
        ("assets/guides/apple-focus-settings.png", "Apple Focus · Support reference", "https://support.apple.com/en-us/105112"),
        ("assets/guides/stayfocusd-blocking-settings-official.png", "StayFocusd · official reference", "https://www.stayfocusd.com/"),
    ]
    image_cells = []
    for filename, caption, source in guide_images:
        path = ROOT / filename
        if path.exists():
            im = Image(str(path))
            scale = min((48 * mm) / im.imageWidth, (50 * mm) / im.imageHeight, 1)
            im.drawWidth = im.imageWidth * scale
            im.drawHeight = im.imageHeight * scale
            image_cells.append([im, Spacer(1, 1 * mm), P(f"{caption}<br/><link href='{source}' color='#27546a'>Source</link>", "SmallGS")])
        else:
            image_cells.append(P(f"Image unavailable: {caption}", "SmallGS"))
    image_table = Table([image_cells], colWidths=[57 * mm] * 3, hAlign="LEFT")
    image_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    story += [image_table, Spacer(1, 3 * mm), P("Official reference interfaces, not screenshots from our device tests. Menus and versions may differ. Full credits: assets/guides/SOURCES.md.", "SmallGS")]
    if (ROOT / "assets" / "guides" / "SOURCES.md").exists():
        story.append(P("Android, Apple, and StayFocusd reference-image URLs and credits: assets/guides/SOURCES.md.", "SmallGS"))
    story += [P("StayFocusd caution", "H2GS"), P("The current Chrome Web Store listing says an active Nuclear Option block cannot be canceled and describes a Require Challenge setting for changing configuration. The first-use guide warns readers away from Nuclear Option and does not promise a pause, allowlist, or undo control for an active block.")]
    story += [P("Official sources", "H2GS"), P("Android Help — Digital Wellbeing and Do Not Disturb; Apple Support — Focus and Screen Time; StayFocusd official site and Chrome Web Store listing. See evidence/SOURCE_LINKS.md for dated per-URL responses, redirect destinations, and referring files.", "BodyGS")]
    story.append(PageBreak())

    story += [P("What remains before submission", "H1GS"), P("Some evidence must come from outside the codebase. It is left explicitly pending rather than inferred from automated checks.")]
    remaining = [["Item", "Status"], ["Student usability review", "Pending: conduct sessions with 3-5 real students. Record anonymized task outcomes, hesitations, revisions, and retests in evidence/USER_TESTING_TEMPLATE.csv."], ["Public website URL", "Pending: deploy to a teacher-accessible host. The local URL is only available on the machine running the app."], ["Device walkthrough", "Pending: test guide steps on named Android/iPhone versions. Official reference screenshots are not device testing."], ["Accessibility", "Patterns and partial browser checks are recorded in evidence/ACCESSIBILITY_CHECKLIST.md. Screen reader, 200% zoom, high contrast, complete keyboard traversal, and physical phone checks remain pending."], ["Product research", "Recheck pricing, compatibility, features, permissions, privacy, and sources on the date of publication."], ["Android APK", "Outside this web-app phase."]]
    story += [table(remaining, [46 * mm, 128 * mm]), Spacer(1, 7 * mm), P("Next actions", "H2GS"), bullet("Run the student review:", "3–5 participants, four core tasks, anonymized notes, and an evidence-based revision plus retest."), bullet("Publish a teacher-accessible URL:", "then repeat route, link, and theme checks against that deployment."), bullet("Recheck product facts:", "pricing, compatibility, permissions, accessibility notes, and privacy disclosures before submission.")]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    build()
    print(OUT)
