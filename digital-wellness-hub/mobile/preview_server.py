"""Local browser QA server that mirrors the WebView route-to-asset contract."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

WWW = Path(__file__).resolve().parent / "app/src/main/assets/www"
MANIFEST = json.loads((WWW / "mobile-route-manifest.json").read_text(encoding="utf-8"))
ROUTES = {**MANIFEST["routeFiles"], **MANIFEST["guides"], **MANIFEST["resources"]}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WWW), **kwargs)

    def translate_path(self, path):
        request_path = unquote(urlsplit(path).path)
        if request_path in ROUTES:
            return str(WWW / ROUTES[request_path])
        if request_path == "/android-settings":
            return str(WWW / "guide/android-wellbeing/index.html")
        if request_path.endswith("/"):
            request_path += "index.html"
        resolved = (WWW / request_path.lstrip("/")).resolve()
        return str(resolved) if resolved == WWW or WWW in resolved.parents else str(WWW / "__missing__")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Mobile bundle QA at http://127.0.0.1:8765 (Ctrl+C to stop)", flush=True)
    server.serve_forever()
