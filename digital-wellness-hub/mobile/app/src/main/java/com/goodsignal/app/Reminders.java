package com.goodsignal.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONObject;
import java.util.Calendar;

public class Reminders extends BroadcastReceiver {
  private static final String CHANNEL = "sleep_reminders";
  private static final String ACTION = "com.goodsignal.app.SLEEP_REMINDER";

  static void channel(Context context) {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Sleep reminders", NotificationManager.IMPORTANCE_DEFAULT));
    }
  }

  static boolean notificationsGranted(Context context) {
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      return false;
    }
    if (!manager.areNotificationsEnabled()) return false;
    if (Build.VERSION.SDK_INT >= 26) {
      channel(context);
      NotificationChannel reminderChannel = manager.getNotificationChannel(CHANNEL);
      return reminderChannel != null && reminderChannel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }
    return true;
  }

  private static String response(boolean ok, String message) {
    JSONObject json = new JSONObject();
    try {
      json.put("ok", ok);
      json.put("message", message);
    } catch (Exception ignored) { }
    return json.toString();
  }

  static synchronized String save(Context context, boolean enabled, int hour, int minute) {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return response(false, "Choose a valid time.");
    }
    try {
      if (enabled && !notificationsGranted(context)) {
        return response(false, "Enable notifications and the sleep reminders channel first.");
      }
      boolean saved = context.getSharedPreferences("wellness", Context.MODE_PRIVATE).edit()
          .putBoolean("enabled", enabled).putInt("hour", hour).putInt("minute", minute).commit();
      if (!saved) {
        disableAfterFailure(context);
        return response(false, "Could not save the reminder; it is turned off.");
      }
      schedule(context);
      return response(true, enabled ? "Sleep reminder saved." : "Sleep reminder turned off.");
    } catch (RuntimeException exception) {
      disableAfterFailure(context);
      return response(false, "Could not schedule the reminder; it is turned off.");
    }
  }

  private static void disableAfterFailure(Context context) {
    context.getSharedPreferences("wellness", Context.MODE_PRIVATE).edit().putBoolean("enabled", false).commit();
    try {
      AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      manager.cancel(pending(context));
    } catch (RuntimeException ignored) { }
  }

  private static PendingIntent pending(Context context) {
    Intent intent = new Intent(context, Reminders.class).setAction(ACTION);
    return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static void schedule(Context context) {
    AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    PendingIntent operation = pending(context);
    manager.cancel(operation);
    SharedPreferences preferences = context.getSharedPreferences("wellness", Context.MODE_PRIVATE);
    if (!preferences.getBoolean("enabled", false)) return;
    Calendar next = Calendar.getInstance();
    next.set(Calendar.HOUR_OF_DAY, preferences.getInt("hour", 22));
    next.set(Calendar.MINUTE, preferences.getInt("minute", 0));
    next.set(Calendar.SECOND, 0);
    next.set(Calendar.MILLISECOND, 0);
    if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
    manager.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), operation);
  }

  static String test(Context context) {
    try {
      if (!notificationsGranted(context)) return response(false, "Enable notifications and the sleep reminders channel first.");
      notify(context, true);
      return response(true, "Test notification sent.");
    } catch (RuntimeException exception) {
      return response(false, "Could not send the notification.");
    }
  }

  private static void notify(Context context, boolean test) {
    channel(context);
    Intent launch = new Intent(context, MainActivity.class);
    PendingIntent content = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder builder = Build.VERSION.SDK_INT >= 26
        ? new Notification.Builder(context, CHANNEL) : new Notification.Builder(context);
    builder.setSmallIcon(context.getResources().getIdentifier("ic_notification", "drawable", context.getPackageName()))
        .setContentTitle(test ? "Good Signal test" : "Time to wind down")
        .setContentText(test ? "Notifications are working." : "A gentle reminder to get ready for sleep.")
        .setContentIntent(content).setAutoCancel(true);
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    manager.notify(test ? 101 : 100, builder.build());
  }

  @Override public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();
    if (ACTION.equals(action)) {
      if (context.getSharedPreferences("wellness", Context.MODE_PRIVATE).getBoolean("enabled", false)) {
        try {
          if (notificationsGranted(context)) notify(context, false);
        } catch (RuntimeException ignored) { }
        schedule(context);
      }
    } else if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
        || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
      schedule(context);
    }
  }
}
