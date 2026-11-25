package com.goodsignal.test;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
public class BridgeHarness extends Instrumentation {
  private boolean fireReminder;
  @Override public void onCreate(Bundle arguments) {
    super.onCreate(arguments);
    fireReminder = arguments != null && "true".equals(arguments.getString("fireReminder"));
    start();
  }
  @Override public void onStart() {
    Intent intent = getTargetContext().getPackageManager().getLaunchIntentForPackage("com.goodsignal.app");
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    startActivitySync(intent);
    if (fireReminder) {
      Intent alarm = new Intent("com.goodsignal.app.SLEEP_REMINDER");
      alarm.setClassName("com.goodsignal.app", "com.goodsignal.app.Reminders");
      getTargetContext().sendBroadcast(alarm);
    }
    runOnMainSync(() -> WebView.setWebContentsDebuggingEnabled(true));
    Bundle status = new Bundle();
    status.putString("message", "Test WebView debugging enabled for 10 minutes.");
    sendStatus(1, status);
    try {
      Thread.sleep(600000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    } finally {
      runOnMainSync(() -> WebView.setWebContentsDebuggingEnabled(false));
      finish(0, new Bundle());
    }
  }
}
