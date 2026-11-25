from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Digital_Wellness_Presentation_and_Submission_Guide.pdf"

INK = colors.HexColor("#14251e")
INK_SOFT = colors.HexColor("#52635b")
GREEN = colors.HexColor("#215d49")
GREEN_DARK = colors.HexColor("#123d30")
LIME = colors.HexColor("#d7edac")
AQUA = colors.HexColor("#bde7dd")
PAPER = colors.HexColor("#f8f7f1")
PAPER_DEEP = colors.HexColor("#eef0e8")
AMBER = colors.HexColor("#f1c982")
BLUE = colors.HexColor("#b8d9f3")
LINE = colors.HexColor("#dfe5da")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=9, leading=12, textColor=GREEN, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=31, leading=34, textColor=INK, spaceAfter=14,
))
styles.add(ParagraphStyle(
    name="CoverSub", parent=styles["Normal"], fontName="Helvetica",
    fontSize=12, leading=18, textColor=INK_SOFT, spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="H1Guide", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=23, leading=27, textColor=INK, spaceBefore=2, spaceAfter=11,
))
styles.add(ParagraphStyle(
    name="H2Guide", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=14, leading=17, textColor=GREEN_DARK, spaceBefore=10, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodyGuide", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.3, leading=13.4, textColor=INK, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="SmallGuide", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.8, leading=10.8, textColor=INK_SOFT, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="SmallBold", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8.2, leading=11, textColor=INK, spaceAfter=2,
))
styles.add(ParagraphStyle(
    name="Label", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.2, leading=9, textColor=GREEN, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.8, leading=9.5, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="TableCell", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.7, leading=10.2, textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableCellBold", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.7, leading=10.2, textColor=INK,
))
styles.add(ParagraphStyle(
    name="Note", parent=styles["BodyText"], fontName="Helvetica-Oblique",
    fontSize=8.3, leading=11.5, textColor=INK_SOFT, leftIndent=8,
))
styles.add(ParagraphStyle(
    name="SlideNumber", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=13, leading=15, textColor=GREEN_DARK,
))
styles.add(ParagraphStyle(
    name="CenterSmall", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.5, leading=10, alignment=TA_CENTER, textColor=INK_SOFT,
))


def P(text, style="BodyGuide"):
    return Paragraph(text, styles[style])


def bullets(items, style="BodyGuide"):
    return [P(f"- {item}", style) for item in items]


def section_title(kicker, title, intro=None):
    parts = [P(kicker.upper(), "CoverKicker"), P(title, "H1Guide")]
    if intro:
        parts.append(P(intro, "BodyGuide"))
    parts.append(Spacer(1, 2))
    return parts


def info_box(title, body, bg=AQUA):
    content = [P(title, "SmallBold"), P(body, "SmallGuide")]
    table = Table([[content]], colWidths=[177 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def slide_block(number, title, show, say, evidence):
    cells = [
        P(f"{number:02d}", "SlideNumber"),
        [P(title, "SmallBold"), P(f"<b>Show:</b> {show}", "SmallGuide"), P(f"<b>Say:</b> {say}", "SmallGuide"), P(f"<b>Evidence:</b> {evidence}", "SmallGuide")],
    ]
    table = Table([cells], colWidths=[14 * mm, 163 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), LIME),
        ("BACKGROUND", (1, 0), (1, 0), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.45, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 7),
        ("RIGHTPADDING", (0, 0), (0, 0), 7),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
        ("RIGHTPADDING", (1, 0), (1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def checklist_row(label, action, evidence, where):
    return [P("[ ]", "TableCellBold"), P(label, "TableCellBold"), P(f"{action}<br/><b>Evidence:</b> {evidence}", "TableCell"), P(where, "TableCell")]


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, pagesize=A4, rightMargin=16 * mm, leftMargin=16 * mm, topMargin=17 * mm, bottomMargin=15 * mm, **kwargs)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="guide", frames=frame, onPage=draw_page)])


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page == 1:
        canvas.setFillColor(GREEN_DARK)
        canvas.rect(0, height - 16 * mm, width, 16 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(16 * mm, 11 * mm, width - 16 * mm, 11 * mm)
    canvas.setFillColor(INK_SOFT)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(16 * mm, 6 * mm, "Good Signal | Digital Wellness Resource Hub")
    canvas.drawRightString(width - 16 * mm, 6 * mm, f"Submission and presentation guide | {doc.page}")
    canvas.restoreState()


def build_story():
    story = []

    # Cover
    story += [Spacer(1, 22 * mm), P("GOOD SIGNAL / PROJECT SUBMISSION", "CoverKicker"), P("How to make the presentation\nfor your Digital Wellness Resource Hub", "CoverTitle"), P("A practical PDF guide for turning the website, research, guides, testing, accessibility work, report, and presentation into one clear submission package.", "CoverSub")]
    story += [Spacer(1, 10 * mm)]
    story.append(info_box("The story your PPT should tell", "A student arrives with a real digital wellness problem. Your hub helps them understand the options, choose a resource that fits their device and budget, configure it with a guide, and leave with a practical next step.", LIME))
    story += [Spacer(1, 12 * mm), P("Use this guide", "H2Guide")]
    story += bullets([
        "Make the PPT first as a story, then attach the evidence files behind each slide.",
        "Use real screenshots and real testing notes. Do not invent participant counts, scores, or link-test results.",
        "Replace placeholders such as [website URL] with your deployed link and current checked dates.",
        "Keep the design calm and readable: one idea per slide, large screenshots, short speaker notes.",
    ])
    story += [Spacer(1, 8 * mm), P("Suggested presentation length: 10 slides / 5-8 minutes", "Label"), P("Current project start command for a local demo: python -m uvicorn server:app --reload", "Note"), PageBreak()]

    # Page 2
    story += section_title("01 / Deck map", "Build the PPT around the evidence", "The presentation should make the evaluator's job easy: every required submission item appears in the story and points to a file they can open.")
    deck_rows = [[P("Slide", "TableHead"), P("Purpose", "TableHead"), P("Main visual", "TableHead"), P("Evidence behind it", "TableHead")]]
    rows = [
        ("1", "Title and website link", "Homepage screenshot", "Website_Link.txt"),
        ("2", "Problem and audience", "Student problem cards", "Report introduction"),
        ("3", "Objectives and method", "Five-step project flow", "Report objectives and methodology"),
        ("4", "Resource selection", "Four category map", "Resource_Comparison.xlsx"),
        ("5", "Comparison criteria", "Comparison table snippet", "Resource_Comparison.xlsx + Official_Sources.xlsx"),
        ("6", "Website demonstration", "Homepage, filters, compare view", "Website + link test record"),
        ("7", "Recommendation and guides", "Quiz result + guide screenshot", "Three setup guides"),
        ("8", "User testing and revisions", "Task table + feedback quote", "Student_Feedback.pdf + Revision_Log.xlsx"),
        ("9", "Accessibility and verification", "Checklist snapshot", "Accessibility_Checklist.pdf + link test record"),
        ("10", "Conclusion and submission", "Final checklist", "Report + all evidence files"),
    ]
    for row in rows:
        deck_rows.append([P(row[0], "TableCellBold"), P(row[1], "TableCellBold"), P(row[2], "TableCell"), P(row[3], "TableCell")])
    deck = Table(deck_rows, colWidths=[13 * mm, 42 * mm, 58 * mm, 64 * mm], repeatRows=1)
    deck.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER_DEEP]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [deck, Spacer(1, 8 * mm), info_box("Presenter rule", "Do not read the slide. Use the slide to point, then explain the decision: what problem you saw, what you built, what you checked, and what changed.", AQUA), PageBreak()]

    # Page 3
    story += section_title("02 / Slides 1-3", "Set up the project in three minutes", "These slides establish why the hub exists, who it serves, and how you approached the work.")
    story += [slide_block(1, "Title + website link", "Project title, team name, one strong homepage screenshot, and the final website URL.", "This is a student-focused resource hub for making informed digital wellness choices.", "Website_Link.txt and the live site."), Spacer(1, 5 * mm)]
    story += [slide_block(2, "Problem statement + audience", "The five problem cards: screen time, distraction, notifications, sleep, and privacy. Add the target audience: college and university students.", "Students do not need another list of apps. They need help moving from a real problem to a resource that fits.", "Report introduction, problem statement, and target audience."), Spacer(1, 5 * mm)]
    story += [slide_block(3, "Objectives + method", "A simple flow: notice the problem -> compare options -> configure a setting -> test with students -> revise.", "The project objectives were to make choices clearer, explain trade-offs, teach practical setup, and improve the hub through testing.", "Report objectives and methodology."), Spacer(1, 8 * mm)]
    story.append(info_box("Design tip", "Use one large screenshot per slide when possible. Crop browser chrome if it does not help the story, but keep the URL or page name visible when it is part of the evidence.", BLUE))
    story.append(PageBreak())

    # Page 4
    story += section_title("03 / Slides 4-6", "Show the product, not just the idea", "This is the core of the presentation: what you chose, how you compared it, and how a student uses the site.")
    story += [slide_block(4, "Resource selection", "Four category labels and a few example resources: screen time, focus, notifications + sleep, privacy + safety.", "We selected ten resources across built-in settings, apps, browser extensions, desktop tools, and account-security support.", "Resource_Comparison.xlsx with all ten resources."), Spacer(1, 5 * mm)]
    story += [slide_block(5, "Comparison framework", "A readable table snippet with purpose, platform, cost, privacy, accessibility, limitations, best fit, official source, and date checked.", "The value is consistency. We did not call one product best for everyone; we made the trade-offs visible.", "Resource_Comparison.xlsx and Official_Sources.xlsx."), Spacer(1, 5 * mm)]
    story += [slide_block(6, "Website demonstration", "Three screenshots: homepage problem entry point, directory filters, and side-by-side comparison. Add one sentence showing the live demo flow.", "A student can start with a problem, filter by device or price, compare up to three resources, and open the official source.", "Website link and Link_Test_Record.xlsx."), Spacer(1, 7 * mm)]
    story.append(info_box("Live demo order", "Open homepage -> choose a problem -> filter by platform -> select two resources -> open comparison -> click a resource icon -> show the official source and date checked.", LIME))
    story.append(PageBreak())

    # Page 5
    story += section_title("04 / Slides 7-10", "Close the loop with guides, testing, and accessibility", "The final slides prove that the site is usable and that you learned from evidence rather than stopping at the first build.")
    story += [slide_block(7, "Recommendation quiz + three setup guides", "Show the quiz with one result and a guide page. Name all three guides: Android Digital Wellbeing, StayFocusd, and Focus / Do Not Disturb.", "The quiz uses transparent rules, while the guides turn a recommendation into a practical action.", "Three guide files with steps, expected result, troubleshooting, source, and date."), Spacer(1, 5 * mm)]
    story += [slide_block(8, "User testing + revisions", "Show the three test tasks, anonymized participant codes, one observed hesitation, and the exact revision that followed.", "We tested whether students could find a tool, check compatibility, and follow a guide. We changed the site based on what they struggled with.", "Student_Feedback.pdf and Revision_Log.xlsx. Use only real results."), Spacer(1, 5 * mm)]
    story += [slide_block(9, "Accessibility + verification", "Show the accessibility checklist and a small link-test summary: navigation, official links, guides, feedback, and mobile layout.", "We checked contrast, readable type, keyboard focus, semantic headings, form labels, mobile behavior, and meaningful links.", "Accessibility_Checklist.pdf and Link_Test_Record.xlsx."), Spacer(1, 5 * mm)]
    story += [slide_block(10, "Conclusion + what is submitted", "Three takeaways, one limitation, and a compact evidence checklist.", "Good Signal helps students make one informed digital wellness choice. Product facts change, so the official sources must be re-checked before publishing.", "Final_Project_Report.pdf, Project_Presentation.pptx, and the complete submission folder."), Spacer(1, 7 * mm)]
    story.append(info_box("Final sentence", "End with the user journey: a student arrives with a problem, understands the options, configures a suitable resource, and leaves with one practical next step.", AMBER))
    story.append(PageBreak())

    # Page 6
    story += section_title("05 / Evidence pack", "Put every required item in one clean folder", "Use consistent names. The evaluator should be able to open the PPT, follow a reference, and find the supporting file without guessing.")
    evidence_rows = [[P("Required item", "TableHead"), P("What it must contain", "TableHead"), P("Suggested filename", "TableHead")]]
    evidence = [
        ("Website link", "Deployed URL; local command only for backup demo.", "Website_Link.txt"),
        ("Resource comparison", "All 10 resources using the same comparison fields.", "Resource_Comparison.xlsx"),
        ("Source links + dates", "Official product, support, pricing, and privacy URLs with date checked.", "Official_Sources.xlsx"),
        ("Three setup guides", "Goal, platform, prerequisites, steps, screenshots, result, troubleshooting, source, date.", "Guide_1_Android.pdf / Guide_2_StayFocusd.pdf / Guide_3_Focus_Mode.pdf"),
        ("Link test record", "Each navigation path, official link, guide link, feedback form, and mobile check.", "Link_Test_Record.xlsx"),
        ("Accessibility checklist", "Contrast, type, responsive layout, alt text, keyboard, focus, headings, labels, motion.", "Accessibility_Checklist.pdf"),
        ("Anonymized feedback", "Participant code, device, task, completion, hesitation, feedback, change, retest.", "Student_Feedback.pdf"),
        ("Revisions", "Issue, evidence, change made, and retest result.", "Revision_Log.xlsx"),
        ("Report", "Introduction through references, with actual screenshots and outcomes.", "Final_Project_Report.pdf"),
        ("Presentation", "The 10-slide story with speaker notes and evidence references.", "Project_Presentation.pptx"),
    ]
    for row in evidence:
        evidence_rows.append([P(row[0], "TableCellBold"), P(row[1], "TableCell"), P(row[2], "TableCell")])
    evidence_table = Table(evidence_rows, colWidths=[36 * mm, 84 * mm, 57 * mm], repeatRows=1)
    evidence_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER_DEEP]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [evidence_table, Spacer(1, 7 * mm), info_box("Recommended folder", "DW_Project/01_Website, 02_Resource_Comparison, 03_Source_Verification, 04_Setup_Guides, 05_Testing, 06_Accessibility, 07_Report, 08_Presentation.", AQUA), PageBreak()]

    # Page 7
    story += section_title("06 / Make the deck strong", "Use visuals as evidence, not decoration", "A good PPT is not a second report. It is a guided tour of the decisions and proof that matter most.")
    visual_rows = [[P("Use", "TableHead"), P("Do", "TableHead"), P("Avoid", "TableHead")]]
    visual_items = [
        ("Screenshots", "Show the exact page or setting being discussed; add a short caption.", "Tiny screenshots, phone photos with personal details, or a collage no one can read."),
        ("Comparison", "Highlight the same 5-8 fields for every resource.", "Marketing language or calling one tool universally best."),
        ("Testing", "Show a task, what the participant did, what confused them, and what changed.", "Invented scores, invented participants, or a claim that every link passed without a record."),
        ("Accessibility", "Show visible focus, readable type, meaningful link labels, and the checklist status.", "Saying 'accessible' without showing what was checked."),
        ("Speaker notes", "Add one or two sentences explaining the decision behind each slide.", "Reading paragraphs from the slide or putting the whole report into the deck."),
    ]
    for row in visual_items:
        visual_rows.append([P(row[0], "TableCellBold"), P(row[1], "TableCell"), P(row[2], "TableCell")])
    visual_table = Table(visual_rows, colWidths=[30 * mm, 73 * mm, 74 * mm], repeatRows=1)
    visual_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER_DEEP]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [visual_table, Spacer(1, 8 * mm), P("PPT build sequence", "H2Guide")]
    story += bullets([
        "1. Create the 10 slide titles first.",
        "2. Add one visual and three short bullets per slide.",
        "3. Add speaker notes that explain the why, not just the what.",
        "4. Link each slide to the supporting evidence filename in a small footer or note.",
        "5. Rehearse the live demo using the same order every time.",
        "6. Export a PDF copy of the PPT if your instructor asks for a backup.",
    ])
    story.append(PageBreak())

    # Page 8
    story += section_title("07 / Final check", "Before you submit, verify the whole chain", "Use this page as the last 20-minute review. Tick only what you actually checked.")
    check_rows = [[P("Done", "TableHead"), P("Check", "TableHead"), P("Evidence or action", "TableHead"), P("Where", "TableHead")]]
    checks = [
        ("Website works", "Open the deployed link in a clean browser window.", "Website link + homepage", "01_Website"),
        ("Resource comparison complete", "All 10 resources use the same fields and clear pricing labels.", "Comparison table", "02_Resource_Comparison"),
        ("Sources dated", "Official product, support, pricing, privacy links have current dates.", "Source log", "03_Source_Verification"),
        ("Three guides ready", "Each guide has steps, screenshots, expected result, troubleshooting, source, date.", "Guide PDFs", "04_Setup_Guides"),
        ("Links tested", "Navigation, official links, guide links, feedback, and mobile layout checked.", "Link test record", "05_Testing"),
        ("Accessibility checked", "Contrast, type, focus, headings, labels, image descriptions, motion.", "Checklist", "06_Accessibility"),
        ("Feedback anonymized", "Use P1-P5 or another code. Remove names, email, accounts, and personal browsing details.", "Feedback record", "05_Testing"),
        ("Revisions recorded", "Every meaningful fix has evidence and a retest result.", "Revision log", "05_Testing"),
        ("Report complete", "Include actual screenshots, method, outcomes, limitations, and references.", "Final report", "07_Report"),
        ("PPT rehearsed", "The deck fits the time and the demo path works without searching.", "Presentation + notes", "08_Presentation"),
    ]
    for row in checks:
        check_rows.append(checklist_row(*row))
    check_table = Table(check_rows, colWidths=[15 * mm, 40 * mm, 82 * mm, 40 * mm], repeatRows=1)
    check_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PAPER_DEEP]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story += [check_table, Spacer(1, 8 * mm), info_box("Final presentation reminder", "Your strongest closing is honest: explain what the hub does well, what is still limited, and how you would improve it with more time. Accurate evidence is more convincing than exaggerated claims.", LIME)]
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDocTemplate(str(OUTPUT), title="Digital Wellness Presentation and Submission Guide", author="Good Signal")
    doc.build(build_story())
    print(OUTPUT)


if __name__ == "__main__":
    main()
