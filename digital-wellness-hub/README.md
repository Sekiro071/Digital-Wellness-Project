# Good Signal — Digital Wellness Resource Hub

Good Signal is a student digital wellness web app with a small FastAPI backend, based on the supplied project blueprint.

## Included

- Home page with problem-first entry points and featured resources
- Resource directory with search, category/platform/pricing filters, local save buttons, and side-by-side comparison for up to three resources
- Private focus session tool with task setup, 25/45/60-minute timer, pause/resume, distraction check-ins, breaks, and local session history
- Rules-based recommendation flow based on goal, device, and budget
- Three setup guides: Android Digital Wellbeing, StayFocusd, and Focus / Do Not Disturb
- Digital safety page covering focus, sleep, tracker awareness, passwords, and phishing pauses
- About page with method, scope, and official starting points
- Anonymous feedback endpoint that stores only the form fields locally on the server
- Responsive design, keyboard-visible focus states, reduced-motion support, semantic headings, and accessible labels

## Folder map

```text
digital-wellness-hub/
├── index.html
├── pages/
│   ├── resources.html
│   ├── recommendations.html
│   ├── focus.html
│   ├── guides.html
│   ├── digital-safety.html
│   ├── about.html
│   └── feedback.html
├── guides/
│   ├── android-wellbeing.html
│   ├── stayfocusd.html
│   └── focus-mode.html
├── css/style.css
├── js/data.js
├── js/app.js
├── js/focus.js
├── data/resources.json
├── server.py
├── requirements.txt
└── README.md
```

## Run with FastAPI

From this folder, install the Python dependencies once:

```bash
python -m pip install -r requirements.txt
```

Then start the site:

```bash
python -m uvicorn server:app --reload
```

Open `http://127.0.0.1:8000`.

The FastAPI layer serves the site and provides clean routes such as `/explore`, `/find`, `/focus`, `/guides`, `/guide/{id}`, and `/resource/{id}`. The resource APIs are `/api/resources` and `/api/resources/{id}`; `/health` reports service status. Original page and guide file URLs remain available, while other project files are not served.

`POST /api/feedback` accepts the three choices shown on the form and an optional `improve` string of up to 1,000 characters. It rejects unknown fields and saves each submission with a UTC timestamp in `data/feedback.sqlite3`, using Python's built-in SQLite support. Concurrent submissions are stored in separate transactions. The application does not automatically migrate or delete any older `data/feedback.json` file; retain it separately if it contains submissions. Feedback can still contain identifying information if a person enters it in the free-text field, so handle and delete it appropriately. The database is created on first submission and the data directory must be writable. Back up the database if submissions matter, and exclude it and SQLite journal files from version control or shared archives. This local demonstration does not include authentication, spam protection, or a hosted deployment configuration.

The resource icons in the directory and recommendation results are now backend links: selecting one opens a server-rendered resource detail page instead of only acting as decoration.

## Test

Install the test client and run the backend tests from this folder:

```bash
python -m pip install httpx
python -m unittest discover -s tests -v
```

Tests use a temporary feedback database; they do not modify saved submissions.

The optional frontend checks use Node only during development. It is not needed to run the website:

```bash
npm ci
npm test
```

These checks execute DOM interactions and simulated timer time. They are not a substitute for rendered browser, screen-reader, or physical phone testing. Read `PROJECT_PLAN.md` for the completion plan, `QA_REPORT.md` for observed results, and `SUBMISSION_CHECKLIST.md` for the remaining presentation evidence.

## Before publishing

The resource details are a research snapshot checked on 09 Nov 2026. Verify product names, features, pricing, platform compatibility, accessibility, permissions, and privacy claims again on the date you publish. Add privacy-safe screenshots from the specific device or browser used for each setup guide, then record real student testing and revisions rather than invented results.
