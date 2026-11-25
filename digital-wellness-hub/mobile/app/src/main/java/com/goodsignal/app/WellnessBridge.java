package com.goodsignal.app;

import android.Manifest;
import android.app.*;
import android.app.usage.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** The bridge is exposed only to the bundled, network-isolated WebView. */
public final class WellnessBridge {
  private final MainActivity activity;
  WellnessBridge(MainActivity activity) {
    this.activity = activity;
  }

  private int usageMode() {
    AppOpsManager ops = (AppOpsManager) activity.getSystemService(Context.APP_OPS_SERVICE);
    if (ops == null) return AppOpsManager.MODE_ERRORED;
    return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(), activity.getPackageName());
  }
  private boolean usageGranted(int mode) {
    // DEFAULT means use the permission's security check, not automatically denied.
    return mode == AppOpsManager.MODE_ALLOWED || (mode == AppOpsManager.MODE_DEFAULT
        && activity.checkSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS)
        == PackageManager.PERMISSION_GRANTED);
  }
  private boolean unlocked() {
    android.os.UserManager manager = (android.os.UserManager) activity.getSystemService(Context.USER_SERVICE);
    return manager != null && manager.isUserUnlocked();
  }
  private void accessState(JSONObject result, boolean granted, String status, String message) throws JSONException {
    result.put("usageGranted", granted);
    result.put("usageStatus", status);
    result.put("usageMessage", message);
    // Android does not expose a reliable public third-party restriction detector.
    // Offer help conditionally; never present this hint as a confirmed diagnosis.
    result.put("restrictedSettingsMayApply", Build.VERSION.SDK_INT >= 33 && !granted);
    result.put("usageRecoveryAction", "needs_access".equals(status) ? "usage_settings"
        : "locked".equals(status) ? "unlock_device" : "unavailable".equals(status) ? "retry" : "none");
  }
  @JavascriptInterface public String getWellnessState() {
    JSONObject result = new JSONObject();
    JSONObject today = new JSONObject();
    JSONObject reminder = new JSONObject();
    JSONArray apps = new JSONArray();
    JSONArray week = new JSONArray();
    try {
      result.put("usageGranted", false);
      result.put("notificationsGranted", false);
      reminder.put("enabled", false);
      reminder.put("hour", 22);
      reminder.put("minute", 0);
      result.put("reminder", reminder);
      int mode = usageMode();
      boolean granted = usageGranted(mode);
      result.put("usageAppOpMode", mode);
      accessState(result, granted, granted ? "ready" : "needs_access", granted
          ? "Usage access is enabled. Estimates stay on this phone."
          : "Usage access is not enabled. In Android Settings, choose Good Signal and turn on Allow usage access. If Android blocks the switch, open App info for help.");
      if (granted && !unlocked()) {
        accessState(result, true, "locked", "Unlock your phone, then refresh to read usage history.");
        result.put("error", "Unlock your phone, then refresh to read usage history.");
      }
      result.put("notificationsGranted", Reminders.notificationsGranted(activity));
      android.content.SharedPreferences prefs = activity.getSharedPreferences("wellness", Context.MODE_PRIVATE);
      reminder.put("enabled", prefs.getBoolean("enabled", false));
      reminder.put("hour", prefs.getInt("hour", 22));
      reminder.put("minute", prefs.getInt("minute", 0));
      result.put("reminder", reminder);
      Calendar start = Calendar.getInstance();
      start.set(Calendar.HOUR_OF_DAY, 0);
      start.set(Calendar.MINUTE, 0);
      start.set(Calendar.SECOND, 0);
      start.set(Calendar.MILLISECOND, 0);
      start.add(Calendar.DAY_OF_YEAR, -6);
      long[] bounds = new long[8];
      for (int i = 0; i < 8; i++) {
        bounds[i] = start.getTimeInMillis();
        start.add(Calendar.DAY_OF_YEAR, 1);
      }
      long[] totals = new long[7];
      Map<String, Long> current = new HashMap<>();
      List<long[]> intervals = new ArrayList<>();
      if (granted && unlocked()) {
        long now = System.currentTimeMillis();
        Calendar lookback = Calendar.getInstance();
        lookback.setTimeInMillis(bounds[0]);
        lookback.add(Calendar.DAY_OF_YEAR, -1);
        UsageStatsManager manager = (UsageStatsManager) activity.getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents events = manager.queryEvents(lookback.getTimeInMillis(), now);
        if (events == null) {
          throw new IllegalStateException("Usage history is unavailable until the device is unlocked.");
        }
        // Track resumed activities separately for split-screen, then union intervals per package.
        Map<String, Set<String>> active = new HashMap<>();
        Map<String, Long> since = new HashMap<>();
        UsageEvents.Event e = new UsageEvents.Event();
        while (events.hasNextEvent()) {
          events.getNextEvent(e);
          int type = e.getEventType();
          long t = e.getTimeStamp();
          String pkg = e.getPackageName();
          // Close every session when the device becomes non-interactive or shuts down.
          if (type == UsageEvents.Event.SCREEN_NON_INTERACTIVE || type == UsageEvents.Event.DEVICE_SHUTDOWN) {
            for (String p : new ArrayList<>(since.keySet())) {
              add(p, since.get(p), t, bounds, current, intervals);
            }
            since.clear();
            active.clear();
            continue;
          }
          if (pkg == null) continue;
          String cls = e.getClassName() == null ? "" : e.getClassName();
          if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
            Set<String> set = active.get(pkg);
            if (set == null) {
              set = new HashSet<>();
              active.put(pkg, set);
            }
            if (set.isEmpty()) since.put(pkg, t);
            set.add(cls);
          } else if (type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
            Set<String> set = active.get(pkg);
            if (set != null && set.remove(cls) && set.isEmpty()) {
              Long sessionStart = since.remove(pkg);
              if (sessionStart != null) add(pkg, sessionStart, t, bounds, current, intervals);
              active.remove(pkg);
            }
          }
        }
        for (String p : since.keySet()) {
          add(p, since.get(p), now, bounds, current, intervals);
        }
      }
      Collections.sort(intervals, (a, b) -> Long.compare(a[0], b[0]));
      long unionStart = -1;
      long unionEnd = -1;
      for (long[] interval : intervals) {
        if (unionStart < 0) {
          unionStart = interval[0];
          unionEnd = interval[1];
        } else if (interval[0] <= unionEnd) {
          unionEnd = Math.max(unionEnd, interval[1]);
        } else {
          addTotal(unionStart, unionEnd, bounds, totals);
          unionStart = interval[0];
          unionEnd = interval[1];
        }
      }
      if (unionStart >= 0) addTotal(unionStart, unionEnd, bounds, totals);
      List<Map.Entry<String, Long>> sorted = new ArrayList<>(current.entrySet());
      Collections.sort(sorted, (a, b) -> Long.compare(b.getValue(), a.getValue()));
      for (Map.Entry<String, Long> entry : sorted) {
        JSONObject app = new JSONObject();
        app.put("packageName", entry.getKey());
        app.put("name", label(entry.getKey()));
        app.put("foregroundMs", entry.getValue());
        apps.put(app);
      }
      SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
      for (int i = 0; i < 7; i++) {
        JSONObject day = new JSONObject();
        day.put("date", fmt.format(new Date(bounds[i])));
        day.put("totalMs", totals[i]);
        week.put(day);
      }
      today.put("totalMs", totals[6]);
      today.put("apps", apps);
      result.put("today", today);
      result.put("week", week);
      // Recheck after collection: access can be revoked while a query is running.
      if (granted && !usageGranted(usageMode())) {
        accessState(result, false, "needs_access", "Usage access was turned off. You can reconnect in Android Settings.");
        today.put("totalMs", 0);
        today.put("apps", new JSONArray());
        result.put("week", new JSONArray());
      }
    } catch (Exception exception) {
      try {
        today.put("totalMs", 0);
        today.put("apps", new JSONArray());
        result.put("today", today);
        result.put("week", week);
        boolean granted = false;
        try { granted = usageGranted(usageMode()); } catch (RuntimeException ignored) { }
        String message = !granted
            ? "Usage access is not enabled. Reconnect in Android Settings, or open App info if Android blocks the switch."
            : !unlocked() ? "Unlock your phone, then refresh to read usage history."
            : "Android could not provide usage history right now. Try Refresh; access is still enabled.";
        accessState(result, granted, !granted ? "needs_access" : !unlocked() ? "locked" : "unavailable", message);
        result.put("error", message);
      } catch (JSONException ignored) { }
    }
    return result.toString();
  }
  private static void add(String pkg, long from, long to, long[] bounds,
                          Map<String, Long> current, List<long[]> intervals) {
    if (to <= from) return;
    intervals.add(new long[]{from, to});
    long ms = Math.max(0, Math.min(to, bounds[7]) - Math.max(from, bounds[6]));
    if (ms > 0) current.put(pkg, current.containsKey(pkg) ? current.get(pkg) + ms : ms);
  }
  private static void addTotal(long from, long to, long[] bounds, long[] totals) {
    for (int i = 0; i < 7; i++) {
      totals[i] += Math.max(0, Math.min(to, bounds[i + 1]) - Math.max(from, bounds[i]));
    }
  }
  private String label(String pkg) {
    try {
      PackageManager manager = activity.getPackageManager();
      return manager.getApplicationLabel(manager.getApplicationInfo(pkg, 0)).toString();
    } catch (Exception exception) {
      String suffix = pkg.substring(pkg.lastIndexOf('.') + 1).replace('_', ' ').replace('-', ' ');
      return suffix.isEmpty() ? pkg : Character.toUpperCase(suffix.charAt(0)) + suffix.substring(1);
    }
  }

  private void launch(Intent intent, Intent fallback) {
    activity.runOnUiThread(() -> {
      try {
        activity.startActivity(intent);
      } catch (RuntimeException exception) {
        if (fallback != null) {
          try { activity.startActivity(fallback); return; } catch (RuntimeException ignored) { }
        }
        android.widget.Toast.makeText(activity, "Android Settings could not open. Open Settings > Apps > Special app access > Usage access.", android.widget.Toast.LENGTH_LONG).show();
        activity.nativeUpdate();
      }
    });
  }

  @JavascriptInterface public void openUsageSettings() {
    // Package-specific screen where supported, with the full list as OEM fallback.
    launch(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS,
        android.net.Uri.parse("package:" + activity.getPackageName())),
        new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS));
  }

  @JavascriptInterface public void openAppSettings() {
    launch(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        android.net.Uri.parse("package:" + activity.getPackageName())), new Intent(Settings.ACTION_SETTINGS));
  }

  @JavascriptInterface public void showUsageAccessHelp() {
    activity.runOnUiThread(() -> {
      if (activity.isFinishing() || activity.isDestroyed()) return;
      activity.newDialogBuilder()
          .setTitle("Connect screen time")
          .setMessage("Usage access lets Good Signal estimate which apps you use and for how long. Data stays on this phone; habits and focus work without access.\n\nIn Usage access, choose Good Signal and enable Allow usage access.\n\nIf Android says access was denied or the setting is restricted, open App info. On some Android 13+ phones, the three-dot menu offers Allow restricted settings. Only approve this if you trust this APK, then return to Usage access. This option may not appear on every phone.\n\nA work profile, parental control or device policy may block access. Good Signal cannot override these protections.")
          .setPositiveButton("Usage access", (dialog, which) -> openUsageSettings())
          .setNeutralButton("App info", (dialog, which) -> openAppSettings())
          .setNegativeButton("Later", null).show();
    });
  }

  @JavascriptInterface public void setSystemTheme(boolean dark) {
    activity.runOnUiThread(() -> activity.setSystemTheme(dark));
  }

  @JavascriptInterface public void openNotificationSettings() {
    activity.runOnUiThread(() -> {
      Intent details = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          android.net.Uri.parse("package:" + activity.getPackageName()));
      if (Build.VERSION.SDK_INT >= 26) {
        Intent notificationSettings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
        try {
          activity.startActivity(notificationSettings);
          return;
        } catch (android.content.ActivityNotFoundException | SecurityException exception) {
          // Some devices do not provide this settings screen; try app details.
        }
      }
      try {
        activity.startActivity(details);
      } catch (android.content.ActivityNotFoundException | SecurityException exception) {
        activity.nativeUpdate();
      }
    });
  }

  @JavascriptInterface public void requestNotifications() {
    activity.runOnUiThread(() -> {
      if (Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
          != PackageManager.PERMISSION_GRANTED) {
        if (activity.getSharedPreferences("wellness", Context.MODE_PRIVATE).getBoolean("notificationAsked", false)
            && !activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
          openNotificationSettings();
        } else if (activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
          activity.newDialogBuilder().setTitle("Sleep reminders")
              .setMessage("Allow notifications for your chosen wind-down time. You can keep using Good Signal without them.")
              .setPositiveButton("Continue", (dialog, which) -> askNotifications())
              .setNegativeButton("Later", null).show();
        } else {
          askNotifications();
        }
      } else {
        activity.nativeUpdate();
      }
    });
  }

  private void askNotifications() {
    activity.getSharedPreferences("wellness", Context.MODE_PRIVATE).edit().putBoolean("notificationAsked", true).apply();
    activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 173);
  }

  @JavascriptInterface public String saveSleepReminder(boolean enabled, int hour, int minute) {
    return Reminders.save(activity, enabled, hour, minute);
  }

  @JavascriptInterface public String sendTestNotification() {
    return Reminders.test(activity);
  }
}
