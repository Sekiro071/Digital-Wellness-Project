package com.goodsignal.app;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.*;
import java.io.*;
import java.util.*;

public class MainActivity extends Activity {
  private static final String HOST = "appassets.androidplatform.net";
  private static final int LIGHT_BACKGROUND = 0xfff7f8fa;
  private static final int DARK_BACKGROUND = 0xff111318;
  private static final String DISMISS_OVERLAY_SCRIPT = "(function(){var modal=document.querySelector('[data-compare-modal]');if(modal&&!modal.hidden&&getComputedStyle(modal).display!=='none'&&getComputedStyle(modal).visibility!=='hidden'){var close=modal.querySelector('[data-close-compare]');if(close){close.click();return true;}}var more=document.querySelector('.app-more[open]');if(more){more.open=false;var summary=more.querySelector('summary');if(summary)summary.focus();return true;}return false;})()";
  private WebView web;
  private boolean backDispatchPending;
  private android.widget.FrameLayout container;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    // Android removes alarms after a force-stop; restore the user's opt-in on launch.
    if (getSharedPreferences("wellness", MODE_PRIVATE).getBoolean("enabled", false)) {
      try {
        Reminders.schedule(this);
      } catch (RuntimeException exception) {
        android.util.Log.e("GoodSignal", "Could not restore the sleep reminder", exception);
      }
    }
    int barsAppearance = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    if (android.os.Build.VERSION.SDK_INT >= 26) barsAppearance |= android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    getWindow().getDecorView().setSystemUiVisibility(barsAppearance);
    web = new WebView(this);
    container = new android.widget.FrameLayout(this);
    container.setBackgroundColor(LIGHT_BACKGROUND);
    container.addView(web, new android.widget.FrameLayout.LayoutParams(-1, -1));
    setContentView(container);
    setSystemTheme(getSharedPreferences("wellness", MODE_PRIVATE).getBoolean("darkTheme", false));
    if (android.os.Build.VERSION.SDK_INT >= 35) {
      container.setOnApplyWindowInsetsListener((v, insets) -> {
        android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
        android.graphics.Insets keyboard = insets.getInsets(android.view.WindowInsets.Type.ime());
        v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
        return insets;
      });
      container.requestApplyInsets();
    }
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setBlockNetworkLoads(true);
    ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) { return empty(); }
    });
    web.addJavascriptInterface(new WellnessBridge(this), "GoodSignalAndroid");
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
        if (!isLocal(Uri.parse(url)) || isFinishing() || isDestroyed()) {
          result.cancel();
          return true;
        }
        newDialogBuilder().setTitle("Good Signal").setMessage(message)
            .setPositiveButton("Confirm", (dialog, which) -> result.confirm())
            .setNegativeButton("Cancel", (dialog, which) -> result.cancel())
            .setOnCancelListener(dialog -> result.cancel()).show();
        return true;
      }
    });
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri u = request.getUrl();
        if (isLocal(u)) {
          if ("/android-settings".equals(u.getPath())) {
            try {
              startActivity(new Intent().setClassName("com.google.android.apps.wellbeing", "com.google.android.apps.wellbeing.settings.TopLevelSettingsActivity"));
            } catch (ActivityNotFoundException | SecurityException e) {
              try {
                startActivity(new Intent(Settings.ACTION_SETTINGS));
              } catch (ActivityNotFoundException | SecurityException ignored) { }
            }
            return true;
          }
          return false;
        }
        if (request.isForMainFrame() && "https".equals(u.getScheme())) {
          try {
            startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE));
          } catch (ActivityNotFoundException ignored) { }
        }
        return true;
      }
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri u = request.getUrl();
        if (!isLocal(u) || !"GET".equals(request.getMethod())) return empty();
        String path = u.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        else if (path.endsWith("/")) path += "index.html";
        else if (!path.substring(path.lastIndexOf('/') + 1).contains(".")) path += "/index.html";
        if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return empty();
        try {
          InputStream in = getAssets().open("www" + path);
          String ext = MimeTypeMap.getFileExtensionFromUrl(path);
          String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.ROOT));
          if (type == null) type = "application/octet-stream";
          Map<String, String> headers = new HashMap<>();
          headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
          headers.put("X-Content-Type-Options", "nosniff");
          return new WebResourceResponse(type, type.startsWith("text/") || type.contains("javascript") || type.contains("json") ? "UTF-8" : null, 200, "OK", headers, in);
        } catch (IOException e) { return empty(); }
      }
      @Override public void onPageFinished(WebView view, String url) {
        // Restore theme after every local navigation, including pages without the dashboard.
        if (isLocal(Uri.parse(url))) {
          view.evaluateJavascript("(function(){function sync(){if(window.GoodSignalAndroid){GoodSignalAndroid.setSystemTheme(document.documentElement.getAttribute('data-theme')==='dark');}}sync();if(!window.__goodSignalThemeObserver){window.__goodSignalThemeObserver=new MutationObserver(sync);window.__goodSignalThemeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}})()", null);
          nativeUpdate();
        }
      }
    });
    if (state == null || web.restoreState(state) == null) web.loadUrl("https://" + HOST + "/");
  }
  void nativeUpdate() {
    if (web != null && !isFinishing() && !isDestroyed()) web.evaluateJavascript("window.dispatchEvent(new Event('goodsignal-native-update'))", null);
  }

  void setSystemTheme(boolean dark) {
    if (isFinishing() || isDestroyed()) return;
    int background = dark ? DARK_BACKGROUND : LIGHT_BACKGROUND;
    if (container != null) container.setBackgroundColor(background);
    if (web != null) web.setBackgroundColor(background);
    getWindow().setStatusBarColor(background);
    getWindow().setNavigationBarColor(background);
    if (android.os.Build.VERSION.SDK_INT >= 29) {
      // Our solid inset background supplies contrast in both navigation modes.
      getWindow().setNavigationBarContrastEnforced(false);
      getWindow().setStatusBarContrastEnforced(false);
    }
    int flags = getWindow().getDecorView().getSystemUiVisibility();
    int light = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    if (android.os.Build.VERSION.SDK_INT >= 26) light |= android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    getWindow().getDecorView().setSystemUiVisibility(dark ? flags & ~light : flags | light);
    if (android.os.Build.VERSION.SDK_INT >= 30) {
      android.view.WindowInsetsController controller = getWindow().getInsetsController();
      if (controller != null) {
        int appearance = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
        controller.setSystemBarsAppearance(dark ? 0 : appearance, appearance);
      }
    }
    getSharedPreferences("wellness", MODE_PRIVATE).edit().putBoolean("darkTheme", dark).apply();
  }

  @Override protected void onResume() {
    super.onResume();
    nativeUpdate();
  }

  android.app.AlertDialog.Builder newDialogBuilder() {
    boolean dark = getSharedPreferences("wellness", MODE_PRIVATE).getBoolean("darkTheme", false);
    return new android.app.AlertDialog.Builder(this, dark
        ? android.app.AlertDialog.THEME_DEVICE_DEFAULT_DARK
        : android.app.AlertDialog.THEME_DEVICE_DEFAULT_LIGHT);
  }

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
    super.onRequestPermissionsResult(requestCode, permissions, results);
    nativeUpdate();
  }

  private static boolean isLocal(Uri u) {
    return "https".equals(u.getScheme()) && HOST.equals(u.getHost())
        && (u.getPort() == -1 || u.getPort() == 443) && u.getUserInfo() == null;
  }

  private WebResourceResponse empty() {
    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
  }

  @Override protected void onSaveInstanceState(Bundle out) {
    if (web != null) web.saveState(out);
    super.onSaveInstanceState(out);
  }

  @Override protected void onDestroy() {
    if (web != null) {
      web.removeJavascriptInterface("GoodSignalAndroid");
      if (web.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup) web.getParent()).removeView(web);
      web.stopLoading();
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }

  @Override public void onBackPressed() {
    if (backDispatchPending) return;
    if (web == null || web.getUrl() == null || !isLocal(Uri.parse(web.getUrl()))) {
      navigateBack();
      return;
    }
    final WebView current = web;
    final String url = web.getUrl();
    backDispatchPending = true;
    // Use the existing close control so comparison focus/inert cleanup stays in one place.
    current.evaluateJavascript(DISMISS_OVERLAY_SCRIPT, handled -> {
      backDispatchPending = false;
      if (isFinishing() || isDestroyed() || web != current || !url.equals(current.getUrl())) return;
      if (!"true".equals(handled)) navigateBack();
    });
  }

  private void navigateBack() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }
}








