import unittest
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from fastapi.testclient import TestClient
import server


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for name in ('href', 'src'):
            if attrs.get(name):
                self.targets.append(attrs[name])


class LinkTests(unittest.TestCase):
    def test_every_internal_page_asset_and_fragment(self):
        paths = list(server.PAGE_ROUTES) + ['/guide/' + key for key in server.GUIDE_ROUTES]
        paths += ['/resource/' + resource['id'] for resource in server.load_resources()]
        checks = set()
        with TestClient(server.app) as client:
            for path in paths:
                response = client.get(path)
                self.assertEqual(response.status_code, 200, path)
                parsed = Links()
                parsed.feed(response.text)
                for target in parsed.targets:
                    resolved = urlsplit(urljoin('http://testserver' + path, target))
                    if resolved.netloc != 'testserver' or resolved.scheme not in ('http', 'https'):
                        continue
                    key = (resolved.path, resolved.fragment)
                    if key in checks:
                        continue
                    checks.add(key)
                    linked = client.get(resolved.path)
                    self.assertEqual(linked.status_code, 200, (path, target))
                    if resolved.fragment:
                        destination = Links()
                        destination.feed(linked.text)
                        self.assertIn(resolved.fragment, destination.ids, (path, target))
        print(f'Checked {len(paths)} page responses and {len(checks)} distinct internal targets/fragments.')


if __name__ == '__main__':
    unittest.main()
