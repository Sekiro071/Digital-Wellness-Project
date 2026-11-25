import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

import server


class ServerTests(unittest.TestCase):
    def test_resource_detail_links_are_labeled_and_safe(self):
        resource = next(item for item in server.load_resources() if item['id'] == 'ublock-origin')
        resource['links'].append({'label': 'unsafe', 'url': 'javascript:alert(1)'})
        html = server.resource_detail_html(resource)
        self.assertIn('Firefox Add-ons listing', html)
        self.assertIn('Official project', html)
        self.assertNotIn('javascript:alert', html)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.feedback_path = Path(self.temp.name) / "feedback.sqlite3"
        self.path_patch = patch.object(server, "FEEDBACK_PATH", self.feedback_path)
        self.path_patch.start()
        self.client = TestClient(server.app)
        self.payload = {"ease": "5 — Very easy", "found": "Yes", "guide": "4 — Easy", "improve": "A useful note"}

    def tearDown(self):
        self.client.close()
        self.path_patch.stop()
        self.temp.cleanup()

    def test_pages_and_resources(self):
        for route in [*server.PAGE_ROUTES, "/index.html", "/pages/feedback.html", "/guide/stayfocusd", "/guides/stayfocusd.html", "/css/style.css", "/js/app.js"]:
            with self.subTest(route=route):
                self.assertEqual(self.client.get(route).status_code, 200)
        resources = self.client.get("/api/resources").json()
        self.assertTrue(resources)
        resource_id = resources[0]["id"]
        self.assertEqual(self.client.get(f"/api/resources/{resource_id}").json(), resources[0])
        self.assertEqual(self.client.get(f"/resource/{resource_id}").status_code, 200)
        for route in ["/missing", "/guide/missing", "/resource/missing", "/api/resources/missing"]:
            self.assertEqual(self.client.get(route).status_code, 404)

    def test_private_files_are_not_public(self):
        for path in ["/server.py", "/README.md", "/requirements.txt", "/data/resources.json", "/data/feedback.json", "/data/feedback.sqlite3", "/.gitignore", "/tests/test_server.py", "/pages/../server.py", "/%2e%2e/server.py", "/css/../server.py"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)

    def test_feedback_validation_and_persistence(self):
        bad = [{**self.payload, "ease": " "}, {**self.payload, "found": "maybe"}, {**self.payload, "improve": "x" * 1001}, {**self.payload, "extra": "secret"}, {**self.payload, "improve": 42}]
        for payload in bad:
            self.assertEqual(self.client.post("/api/feedback", json=payload).status_code, 422)
        response = self.client.post("/api/feedback", json=self.payload)
        self.assertEqual(response.status_code, 201)
        with closing(sqlite3.connect(self.feedback_path)) as db:
            rows = db.execute("SELECT received_at, ease, found, guide, improve FROM feedback").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0][0].endswith("+00:00"))
        self.assertEqual(rows[0][1:], tuple(self.payload.values()))

    def test_validation_without_http(self):
        for change in [{"ease": " "}, {"found": "maybe"}, {"improve": "x" * 1001}, {"extra": "secret"}, {"improve": 42}]:
            with self.subTest(change=change), self.assertRaises(ValidationError):
                server.Feedback(**{**self.payload, **change})
        self.assertEqual(server.api_feedback(server.Feedback(**self.payload))["status"], "saved")
        with closing(sqlite3.connect(self.feedback_path)) as db:
            self.assertEqual(db.execute("SELECT improve FROM feedback").fetchone()[0], self.payload["improve"])

    def test_concurrent_submissions_are_retained(self):
        def submit(number):
            return server.api_feedback(server.Feedback(**{**self.payload, "improve": str(number)}))["status"]
        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(submit, range(32)))
        self.assertEqual(statuses, ["saved"] * 32)
        with closing(sqlite3.connect(self.feedback_path)) as db:
            saved = {row[0] for row in db.execute("SELECT improve FROM feedback")}
        self.assertEqual(saved, {str(number) for number in range(32)})

    def test_page_404_is_html_and_api_404_is_json(self):
        page = self.client.get("/guide/missing")
        self.assertEqual(page.status_code, 404)
        self.assertIn("text/html", page.headers["content-type"])
        self.assertIn("Page not found", page.text)
        api = self.client.get("/api/resources/missing")
        self.assertEqual(api.status_code, 404)
        self.assertEqual(api.json(), {"detail": "Resource not found"})
        self.assertEqual(self.client.get("/api/unknown").json(), {"detail": "Not found"})

    def test_resource_html_escapes_data_and_rejects_script_urls(self):
        resource = {"id": "test", "name": '<img src=x onerror="alert(1)">', "purpose": "<script>bad()</script>", "platforms": ["<b>"], "officialUrl": "javascript:alert(1)", "sourceLabel": 'link" onclick="bad()'}
        html = server.resource_detail_html(resource)
        self.assertNotIn("<script>bad()", html)
        self.assertNotIn('<img src=x', html)
        self.assertIn("&lt;img", html)
        self.assertIn("&lt;b&gt;", html)
        self.assertIn('href="#"', html)
        self.assertIn('aria-controls="main-navigation"', html)
        self.assertIn('id="main-navigation"', html)
        self.assertIn('src="/js/app.js"', html)
        self.assertNotIn('section-label">Accessibility', html)
        resource["accessibility"] = "Keyboard <support>"
        html = server.resource_detail_html(resource)
        self.assertIn("Keyboard &lt;support&gt;", html)


if __name__ == "__main__":
    unittest.main()
