import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Presentation, PresentationFile } = await import(pathToFileURL(process.env.GS_ARTIFACT_TOOL).href);
const width = 1280, height = 720;
const C = { ink: "#0d2634", blue: "#dce9ef", pale: "#f7fafb", lime: "#d4ff35", mute: "#516a78", line: "#75909d", white: "#ffffff", dark: "#0b1b27" };
const ppt = Presentation.create({ slideSize: { width, height } });
const previews = path.join(root, "tmp", "presentation-build", "renders");
const stage = path.join(root, "tmp", "presentation-build", "candidate.pptx");
const finalPath = path.join(root, "output", "presentation", "Good_Signal_Project_Presentation_Final.pptx");
await fs.mkdir(previews, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });

function rect(slide, x, y, w, h, fill, radius = 0) {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: "none", width: 0 }, ...(radius ? { borderRadius: radius } : {}) });
}
function text(slide, value, x, y, w, h, size, color = C.ink, bold = false, opts = {}) {
  const shape = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  shape.text = value;
  shape.text.style = { fontFamily: "Arial", fontSize: `${size}pt`, color, bold, ...(opts.align ? { alignment: opts.align } : {}) };
  shape.text.insets = 0;
  return shape;
}
function base(title, kicker = "GOOD SIGNAL") {
  const slide = ppt.slides.add();
  slide.background.fill = C.pale;
  rect(slide, 0, 0, width, 10, C.lime);
  text(slide, kicker, 64, 35, 300, 22, 10, C.mute, true);
  text(slide, title, 64, 76, 1120, 62, 28, C.ink, true);
  rect(slide, 64, 676, 1152, 1, C.line);
  text(slide, "GOOD SIGNAL  /  PROJECT PRESENTATION", 64, 686, 800, 18, 8, C.mute, false);
  text(slide, String(ppt.slides.items.length).padStart(2, "0"), 1160, 684, 56, 20, 9, C.ink, true, { align: "right" });
  return slide;
}
function notes(slide, lines) { slide.speakerNotes.text = lines; }
async function image(slide, file, alt, x, y, w, h, fit = "contain") {
  const bytes = new Uint8Array(await fs.readFile(path.join(root, file)));
  const contentType = file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return slide.images.add({ blob: bytes, contentType, alt, fit, position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: 8 });
}
function card(slide, x, y, w, h, label, body, fill = C.blue) {
  rect(slide, x, y, w, h, fill, 12);
  text(slide, label, x + 22, y + 18, w - 44, 26, 12, C.ink, true);
  text(slide, body, x + 22, y + 54, w - 44, h - 68, 15, C.ink, false);
}

// 1 — Cover
{
  const s = ppt.slides.add(); s.background.fill = C.ink; rect(s, 0, 0, width, 12, C.lime);
  text(s, "GOOD SIGNAL  /  DIGITAL WELLNESS HUB", 72, 62, 750, 28, 11, C.lime, true);
  text(s, "A little less noise.\nRoom to choose.", 72, 150, 760, 170, 38, C.white, true);
  text(s, "A student resource hub for comparing digital wellness tools and trying one practical next step.", 76, 360, 610, 95, 20, "#dce9ef", false);
  rect(s, 820, 150, 360, 350, "#13384a", 20);
  text(s, "EXPLORE", 858, 198, 250, 26, 12, C.lime, true);
  text(s, "Compare options", 858, 235, 280, 32, 17, C.white, false);
  text(s, "CHOOSE", 858, 286, 250, 26, 12, C.lime, true);
  text(s, "Try a guide or focus block", 858, 319, 280, 44, 16, C.white, false);
  text(s, "REVIEW", 858, 388, 250, 26, 12, C.lime, true);
  text(s, "Check the sources and reflect", 858, 421, 280, 48, 16, C.white, false);
  text(s, "Audience: college and university students, roughly 18–24", 76, 560, 700, 30, 14, C.white, true);
  text(s, "Initial needs are design assumptions; student validation is pending.", 76, 598, 840, 25, 11, "#dce9ef", false);
  text(s, "17 NOVEMBER 2026", 76, 672, 500, 20, 9, C.white, false);
  notes(s, ["Introduce the project and intended audience.", "The age range is stated in the About page. Needs such as study distraction and sleep are design assumptions from the brief, not research findings."]);
}

// 2 — User journey and needs assumptions
{
  const s = base("One problem, one clear next step", "THE IDEA");
  text(s, "The hub is designed for students balancing classes, social life, sleep, and several devices.", 66, 151, 1040, 45, 17, C.mute, false);
  const labels = [["01  NOTICE", "Phone use, study distraction, notifications, sleep, or tracking concerns."], ["02  COMPARE", "See purpose, platform, cost, privacy, accessibility, and limits."], ["03  TRY", "Follow a setup guide or start a short focus block."], ["04  REFLECT", "Adjust the choice and share optional feedback."]];
  labels.forEach((d, i) => card(s, 66 + i * 286, 255, 260, 210, d[0], d[1], i % 2 ? C.blue : "#e4f4f1"));
  rect(s, 66, 515, 1148, 94, "#fff1c9", 12);
  text(s, "VALIDATION STATUS", 88, 535, 190, 22, 10, C.ink, true);
  text(s, "These starting needs are assumptions, not findings. Run 3–5 student sessions before presenting them as confirmed.", 88, 565, 1080, 28, 14, C.ink, false);
  notes(s, ["Audience: college and university students, roughly 18–24 (About page).", "The initial needs are design assumptions. No student interviews or usability sessions have been completed; the feedback template is blank."]);
}

// 3 — Product tour
{
  const s = base("A small set of useful tools", "THE HUB");
  card(s, 66, 160, 344, 190, "Explore resources", "Search, filter, save locally, and compare up to three options.", "#e4f4f1");
  card(s, 468, 160, 344, 190, "Find a tool", "Filter by goal, platform, and budget before ranking matches.", C.blue);
  card(s, 870, 160, 344, 190, "Follow a guide", "Android Digital Wellbeing, StayFocusd, or Focus / Do Not Disturb.", "#fff1c9");
  await image(s, "output/sol-theme-checks/home-1440-light.png", "Good Signal home page in desktop light theme", 66, 390, 500, 230, "cover");
  text(s, "A clear path from an everyday concern to an option the student can check for themselves.", 620, 420, 520, 112, 20, C.ink, true);
  text(s, "No account needed for resource browsing or the private focus timer.", 620, 550, 500, 56, 14, C.mute, false);
  notes(s, ["Product features are descriptions of this project build.", "Home screenshot captured from the local Good Signal app; it is not a third-party product screenshot."]);
}

// 4 — Comparison
{
  const s = base("Compare trade-offs, not slogans", "RESOURCE DIRECTORY");
  text(s, "Ten resources share consistent comparison fields. Filter by device and budget.", 66, 150, 465, 80, 18, C.ink, false);
  text(s, "PURPOSE\nPLATFORM\nCOST\nPRIVACY\nACCESSIBILITY\nLIMITS\nSOURCE + CHECK DATE", 68, 272, 440, 240, 14, C.mute, true);
  await image(s, "output/sol-theme-checks/explore-1440-light.png", "Good Signal resource directory on desktop in light theme", 570, 168, 635, 315, "contain");
  rect(s, 570, 512, 635, 90, C.ink, 12);
  text(s, "Standalone comparison table", 596, 531, 580, 25, 12, C.lime, true);
  text(s, "evidence/RESOURCE_COMPARISON.csv", 596, 564, 580, 24, 14, C.white, false);
  notes(s, ["The downloadable comparison is generated from the canonical resource data.", "Pricing and product claims can change; the sheet shows a check date and directs students to official pages."]);
}

// 5 — Setup guides and authentic reference images
{
  const s = base("From recommendation to setup", "THREE GUIDES");
  const imgs = [
    ["assets/guides/android-app-timer-official.png", "Official Google Play Digital Wellbeing screenshot showing an app timer reached", "Android Digital Wellbeing"],
    ["assets/guides/apple-focus-settings.png", "Official Apple Support Focus settings illustration", "Apple Focus / Do Not Disturb"],
    ["assets/guides/stayfocusd-blocking-settings-official.png", "StayFocusd official blocking settings screenshot", "StayFocusd"],
  ];
  const xs = [100, 468, 836];
  for (const [i, item] of imgs.entries()) {
    await image(s, item[0], item[1], xs[i], 165, 300, 300, "contain");
    text(s, item[2], xs[i], 485, 300, 38, 14, C.ink, true, { align: "center" });
  }
  rect(s, 66, 548, 1148, 77, "#fff1c9", 12);
  text(s, "OFFICIAL REFERENCE IMAGES  /  MENU LABELS MAY VARY  /  NO DEVICE WALKTHROUGH CLAIMED", 88, 574, 1095, 30, 11, C.ink, true);
  notes(s, ["The images are authentic provider illustrations/screenshots credited in assets/guides/SOURCES.md and on each guide page.", "They illustrate the official product interfaces; they were not captured during device tests for this project. The Android Play Store promotional screenshot may show a previous UI design. Check the current device interface before following a step.", "StayFocusd caution: the current Chrome Web Store listing says the active Nuclear Option block cannot be canceled. The guide warns readers not to use it for a first test and does not promise a pause or undo control."]);
}

// 6 — Focus and privacy
{
  const s = base("A study block without another account", "FOCUS SESSION");
  await image(s, "output/sol-theme-checks/focus-1440-light.png", "Good Signal focus timer setup page, desktop light theme", 66, 165, 630, 360, "contain");
  card(s, 750, 165, 440, 124, "Choose a duration", "25, 45, or 60 minutes, with a break option.", "#e4f4f1");
  card(s, 750, 318, 440, 124, "Keep control", "Pause, resume, check in, finish early, or clear history.", C.blue);
  card(s, 750, 471, 440, 124, "Know where data stays", "Task and history stay in this browser until site data is cleared.", "#fff1c9");
  notes(s, ["The browser stores the focus task and history locally; the feedback form is separate and is stored by the local server.", "The project is a local demo, not a deployed service. No activity analytics are claimed."]);
}

// 7 — Evidence
{
  const s = base("Verification completed", "TESTS AND REVIEW");
  const rows = [["12/12", "frontend tests"], ["9/9", "backend tests"], ["21", "page responses"], ["40", "internal destinations, assets, fragments"]];
  rows.forEach((r, i) => {
    const x = 66 + (i % 2) * 570, y = 164 + Math.floor(i / 2) * 154;
    rect(s, x, y, 520, 126, i === 1 ? C.blue : "#e4f4f1", 14);
    text(s, r[0], x + 24, y + 19, 188, 47, 26, C.ink, true);
    text(s, r[1], x + 214, y + 30, 278, 56, 14, C.ink, false);
  });
  rect(s, 66, 500, 1148, 108, C.ink, 12);
  text(s, "External links", 90, 520, 200, 24, 11, C.lime, true);
  text(s, "23/23 public URLs returned successful HTTP responses on 17 Nov 2026. See SOURCE_LINKS.md for per-URL status.", 90, 553, 1070, 36, 14, C.white, false);
  notes(s, ["Test counts and route/link totals are from the parent integration run after all guide images were embedded.", "The external link checker covers public HTML hrefs, source/install/store/privacy/pricing URLs in canonical resource data, and official guide image source pages.", "Automated tests do not establish accessibility conformance."]);
}

// 8 — Pending evidence and next steps
{
  const s = base("What still needs real-world evidence", "NEXT STEPS");
  card(s, 66, 160, 544, 170, "Student review · pending", "Invite 3–5 students. Observe four tasks, write anonymized notes, revise, and retest.", "#fff1c9");
  card(s, 670, 160, 544, 170, "Public URL · pending", "Deploy a teacher-accessible copy. Localhost works only on the computer running the app.", C.blue);
  card(s, 66, 382, 544, 170, "Device review · pending", "Check guide steps on named Android/iPhone versions; provider images are references only.", "#e4f4f1");
  card(s, 670, 382, 544, 170, "Recheck sources", "Confirm features, prices, permissions, compatibility, privacy, and accessibility on publish date.", "#e7e7f2");
  text(s, "No participant results, testimonials, or public deployment are claimed.", 68, 590, 1100, 34, 14, C.mute, true);
  notes(s, ["Do not fill the anonymized testing template until real participants have consented and tasks are observed.", "The local deployment has not been published. Android APK packaging is outside this phase."]);
}

for (const [index, slide] of ppt.slides.items.entries()) {
  const png = await ppt.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(previews, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
}
await (await PresentationFile.exportPptx(ppt)).save(stage);
const skillRoot = "C:/Users/Shreyansh/.codex/plugins/cache/openai-primary-runtime/presentations/26.1116.12020/skills/presentations";
const { finalizePresentation } = await import(pathToFileURL(path.join(skillRoot, "container_tools/artifact_tool_utils.mjs")).href);
const result = await finalizePresentation({
  explicitTotalSlideCount: 8,
  workspaceDir: root,
  candidatePath: stage,
  finalPath,
  pythonExecutable: process.env.GS_PYTHON,
  integrityValidatorPath: path.join(skillRoot, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillRoot, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", `${width * 9525},${height * 9525}`, "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: ["Arial"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(root, "tmp", "presentation-build", "validation-final.json"),
});
nodeResult(result);

function nodeResult(value) { console.log(JSON.stringify({ finalPath, validation: value })); }
