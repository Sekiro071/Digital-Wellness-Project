# Good Signal — Digital Wellness Resource Hub

Good Signal is a polished, static student resource hub based on the supplied Digital Wellness Resource Hub project blueprint.

## Included

- Home page with problem-first entry points and featured resources
- Resource directory with search, category/platform/pricing filters, local save buttons, and side-by-side comparison for up to three resources
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
├── data/resources.json
├── server.py
├── requirements.txt
└── README.md
```

## Run with FastAPI

From this folder, install the two small Python dependencies once:

```bash
python -m pip install -r requirements.txt
```

Then start the site:

```bash
python -m uvicorn server:app --reload
```

Open `http://127.0.0.1:8000`.

The FastAPI layer is intentionally small. It serves the site, provides clean routes such as `/explore`, `/find`, `/guides`, and `/resource/{id}`, exposes `/api/resources`, and saves only the anonymous feedback fields submitted to `/api/feedback` in `data/feedback.json`.

The resource icons in the directory and recommendation results are now backend links: selecting one opens a server-rendered resource detail page instead of only acting as decoration.

## Before publishing

The resource details are a research snapshot checked on 09 Nov 2026. Verify product names, features, pricing, platform compatibility, accessibility, permissions, and privacy claims again on the date you publish. Add privacy-safe screenshots from the specific device or browser used for each setup guide, then record real student testing and revisions rather than invented results.
