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
    routes=["/","/explore","/focus","/find","/feedback","/guides","/safety","/about","/guide/stayfocusd","/guide/android-wellbeing","/guide/focus-mode"]+["/resource/"+x["id"] for x in get(base+"/api/resources")]+["/missing-theme-route"]
    inspect="""(() => {
      const style = selector => {const node=document.querySelector(selector); return node ? getComputedStyle(node).backgroundColor : null;};
      return {theme:document.documentElement.dataset.theme, scheme:getComputedStyle(document.documentElement).colorScheme,
      count:document.querySelectorAll('.theme-toggle').length,label:document.querySelector('.theme-toggle').ariaLabel,
      overflow:document.documentElement.scrollWidth > innerWidth, body:style('body'), hero:style('.hero,.page-hero'), footer:style('footer'),
      card:style('.resource-card,.focus-timer-card,.form-card,.quiz-card,.info-card'), study:style('.study-preview')};
    })()"""
    def capture(name):
        png=cdp("Page.captureScreenshot",format="png",captureBeyondViewport=False)
        (output/(name+".png")).write_bytes(base64.b64decode(png["data"]))
    def activate():
        js("document.querySelector('.theme-toggle').click()")
    def control_contrast(selector):
        return js("""(() => {
           const element = document.querySelector(""" + json.dumps(selector) + """);
           if (!element || !element.getClientRects().length) return null;
           const colors = value => value.match(/[0-9.]+/g).map(Number);
           let surface = element;
           while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
           if (!surface) return null;
           const lum = value => colors(value).slice(0,3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
             .reduce((result, x, i) => result + x * [.2126, .7152, .0722][i], 0);
           const a = lum(getComputedStyle(element).color), b = lum(getComputedStyle(surface).backgroundColor);
           return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        })()""")
    cdp("DOM.enable")
    cdp("CSS.enable")
    def verify_controls(route):
        document = cdp("DOM.getDocument")["root"]["nodeId"]
        selectors = [".theme-toggle",".main-nav [aria-current=page]",".field",".select-field",".btn-secondary",".duration-chip.is-selected",".duration-chip:not(.is-selected)",".resource-card .icon-btn"]
        for selector in selectors:
            ratio = control_contrast(selector)
            if ratio is None: continue
            assert ratio >= 4.5, (route,selector,ratio)
            node = cdp("DOM.querySelector",nodeId=document,selector=selector)["nodeId"]
            cdp("CSS.forcePseudoState",nodeId=node,forcedPseudoClasses=["hover"])
            hover = control_contrast(selector)
            assert hover >= 4.5, (route,selector,hover)
            cdp("CSS.forcePseudoState",nodeId=node,forcedPseudoClasses=[])
    results=[]
    for width in (1440,390):
        cdp("Emulation.setDeviceMetricsOverride",width=width,height=900,deviceScaleFactor=1,mobile=False)
        for route in routes:
            navigate(route)
            original=js(inspect)
            verify_controls(route)
            assert original["theme"]=="light",(route,original)
            activate()
            dark=js(inspect)
            verify_controls(route)
            assert dark["theme"]==dark["scheme"]=="dark" and dark["label"]=="Switch to light mode" and dark["count"]==1,(route,dark)
            assert js("localStorage.getItem('good-signal-theme')")=="dark"
            for surface in ("body","hero","footer","card","study"):
                if original[surface]: assert original[surface]!=dark[surface],(route,surface,original,dark)
            if route in ("/","/explore","/focus"):
                js("window.scrollTo(0," + ("0" if route == "/" else "250") + ")")
                time.sleep(.2)
                capture((route.strip("/") or "home")+"-"+str(width)+"-dark")
            activate()
            light=js(inspect)
            assert original==light and light["scheme"]=="light" and light["label"]=="Switch to dark mode" and not light["overflow"] and not dark["overflow"],(width,route,light,dark)
            if route in ("/","/explore","/focus"):
                js("window.scrollTo(0," + ("0" if route == "/" else "250") + ")")
                time.sleep(.2)
                capture((route.strip("/") or "home")+"-"+str(width)+"-light")
            results.append(dict(route=route,width=width,light=light,dark=dark))
    activate()
    navigate("/explore")
    assert js(inspect)["theme"]=="dark"
    for theme in ("dark","light"):
        if js(inspect)["theme"]!=theme: activate()
        js("document.querySelector('[data-compare-id]').click()")
        js("document.querySelector('[data-open-compare]').click()")
        assert js("!document.querySelector('[data-compare-modal]').hidden && !!document.querySelector('.compare-table')")
        assert js("document.querySelector('[data-compare-body]').scrollWidth <= document.querySelector('[data-compare-body]').clientWidth")
        capture("compare-"+theme)
        js("document.querySelector('[data-close-compare]').click()")
        js("document.querySelector('[data-compare-id]').click()")
    (output/"computed-themes.json").write_text(json.dumps(results,indent=2),encoding="utf-8")
    print(f"Edge checked {len(results)} route/viewport combinations, both toggle directions, persistence and comparison dialogs.")
finally:
    browser.terminate()
    server.terminate()

