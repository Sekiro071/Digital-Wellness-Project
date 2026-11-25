import base64, json, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
import websocket
base = "http://127.0.0.1:8767"
output = Path("output/sol-theme-checks")
output.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen([sys.executable, "-m", "uvicorn", "server:app", "--port", "8767", "--no-access-log"])
browser = subprocess.Popen([
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "--headless=new",
    "--disable-gpu", "--no-proxy-server", "--no-first-run", "--disable-background-networking",
    "--remote-debugging-port=9229", "--user-data-dir="+tempfile.mkdtemp(prefix="sol-theme-"), "about:blank"
], stderr=subprocess.DEVNULL)
def get(url):
    for _ in range(100):
        try:
            with urllib.request.urlopen(url, timeout=.5) as response:
                return json.load(response)
        except OSError:
            time.sleep(.1)
    raise RuntimeError(url)
try:
    get(base+"/health")
    target = next(target for target in get("http://127.0.0.1:9229/json/list") if target["type"]=="page")
    ws = websocket.create_connection(target["webSocketDebuggerUrl"],suppress_origin=True,timeout=20)
    counter = 0
    def cdp(method, **params):
        global counter
        counter += 1
        ws.send(json.dumps(dict(id=counter,method=method,params=params)))
        while True:
            data = json.loads(ws.recv())
            if data.get("id")==counter:
                assert "error" not in data,data
                return data["result"]
    def js(expression):
        response = cdp("Runtime.evaluate",expression=expression,returnByValue=True)
        assert "exceptionDetails" not in response,response
        return response["result"].get("value")
    def navigate(route):
        response = cdp("Page.navigate",url=base+route)
        assert "errorText" not in response, response
        for _ in range(100):
            try:
                if js("location.pathname === "+json.dumps(route)+" && !!document.querySelector('.theme-toggle') && (!['/', '/explore'].includes(location.pathname) || !!document.querySelector('.resource-card'))"): return
            except AssertionError:
                pass
            time.sleep(.1)
        raise AssertionError((route,js("[location.href,document.readyState,document.title,document.documentElement.dataset.theme,document.body?.innerText.slice(0,140)]")))
    cdp("Page.enable")
    cdp("Page.bringToFront")
    cdp("Network.enable")
    cdp("Network.setBlockedURLs",urls=["*fonts.googleapis.com*","*fonts.gstatic.com*"])
    cdp("Emulation.setEmulatedMedia",features=[dict(name="prefers-color-scheme",value="light"),dict(name="prefers-reduced-motion",value="reduce")])

    output=Path("output/guide-reference-checks")
    output.mkdir(parents=True,exist_ok=True)
    records=[]
    for width in (1440,390):
        cdp("Emulation.setDeviceMetricsOverride",width=width,height=900,deviceScaleFactor=1,mobile=False)
        for slug in ("android-wellbeing","stayfocusd","focus-mode"):
            route="/guide/"+slug
            navigate(route)
            for theme in ("light","dark"):
                js("localStorage.setItem('good-signal-theme',"+json.dumps(theme)+");document.documentElement.dataset.theme="+json.dumps(theme))
                js("document.querySelector('.guide-reference').scrollIntoView({block:'start'})")
                for _ in range(80):
                    if js("document.querySelector('.guide-reference img').complete && document.querySelector('.guide-reference img').naturalWidth > 0"):break
                    time.sleep(.1)
                result=js("""(() => {
                  const image=document.querySelector('.guide-reference img'),rect=image.getBoundingClientRect();
                  return {loaded:image.complete && image.naturalWidth>0,src:image.getAttribute('src'),theme:document.documentElement.dataset.theme,
                    width:rect.width,height:rect.height,withinViewport:rect.left>=0 && rect.right<=innerWidth,
                    overflow:document.documentElement.scrollWidth>innerWidth};
                })()""")
                assert result["loaded"] and result["withinViewport"] and not result["overflow"],result
                records.append(dict(route=route,viewport=width,**result))
                shot=cdp("Page.captureScreenshot",format="png",captureBeyondViewport=False)
                (output/(slug+"-"+str(width)+"-"+theme+".png")).write_bytes(base64.b64decode(shot["data"]))
    (output/"results.json").write_text(json.dumps(records,indent=2),encoding="utf8")
    print("PASS 3 guide images loaded, 12 route/theme/viewport combinations without overflow.")
finally:
    browser.terminate()
    server.terminate()
