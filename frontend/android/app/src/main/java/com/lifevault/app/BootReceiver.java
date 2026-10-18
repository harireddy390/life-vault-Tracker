package com.lifevault.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

/**
 * BroadcastReceiver for RECEIVE_BOOT_COMPLETED and package updates.
 * Automatically restarts the StepTrackingForegroundService on device boot.
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "LifeVaultBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "Received broadcast action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            SharedPreferences prefs = context.getSharedPreferences(
                StepTrackingForegroundService.PREFS_NAME,
                Context.MODE_PRIVATE
            );

            boolean wasActive = prefs.getBoolean(StepTrackingForegroundService.PREF_IS_ACTIVE, false);

            if (wasActive) {
                Log.i(TAG, "Step tracker was previously active. Auto-restarting StepTrackingForegroundService after boot.");
                Intent serviceIntent = new Intent(context, StepTrackingForegroundService.class);
                serviceIntent.setAction(StepTrackingForegroundService.ACTION_START);

                try {
                    ContextCompat.startForegroundService(context, serviceIntent);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to startForegroundService from BootReceiver", e);
                }
            } else {
                Log.i(TAG, "Step tracker was not enabled before boot. Skipping auto-start.");
            }
        }
    }
}
