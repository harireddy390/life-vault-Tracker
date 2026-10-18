package com.lifevault.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.os.Build;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
    name = "BackgroundStepPlugin",
    permissions = {
        @Permission(
            strings = { Manifest.permission.ACTIVITY_RECOGNITION },
            alias = "activityRecognition"
        ),
        @Permission(
            strings = { "android.permission.POST_NOTIFICATIONS" },
            alias = "notifications"
        )
    }
)
public class BackgroundStepPlugin extends Plugin {

    private static final String TAG = "BackgroundStepPlugin";
    private static BackgroundStepPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyStepUpdateFromService(int steps, String date) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("steps", steps);
            data.put("date", date);
            data.put("isNative", true);
            instance.notifyListeners("stepUpdate", data);
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        Context context = getContext();
        SensorManager sm = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        boolean hasCounter = sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
        boolean hasDetector = sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null;

        JSObject ret = new JSObject();
        ret.put("available", hasCounter || hasDetector);
        ret.put("hasStepCounterChip", hasCounter);
        ret.put("hasStepDetectorChip", hasDetector);
        call.resolve(ret);
    }

    @PluginMethod
    public void getServiceStatus(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(
            StepTrackingForegroundService.PREFS_NAME,
            Context.MODE_PRIVATE
        );

        boolean isActive = prefs.getBoolean(StepTrackingForegroundService.PREF_IS_ACTIVE, false);
        int steps = prefs.getInt(StepTrackingForegroundService.PREF_TODAY_STEPS, 0);
        String savedDate = prefs.getString(StepTrackingForegroundService.PREF_CURRENT_DATE, getTodayDateString());

        // Check permission status
        boolean hasActivityPerm = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            hasActivityPerm = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACTIVITY_RECOGNITION
            ) == PackageManager.PERMISSION_GRANTED;
        }

        JSObject ret = new JSObject();
        ret.put("isActive", isActive);
        ret.put("todaySteps", steps);
        ret.put("date", savedDate);
        ret.put("hasPermission", hasActivityPerm);
        ret.put("isNative", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(
            StepTrackingForegroundService.PREFS_NAME,
            Context.MODE_PRIVATE
        );

        String today = getTodayDateString();
        String savedDate = prefs.getString(StepTrackingForegroundService.PREF_CURRENT_DATE, today);
        int steps = 0;
        if (today.equals(savedDate)) {
            steps = prefs.getInt(StepTrackingForegroundService.PREF_TODAY_STEPS, 0);
        }

        boolean isActive = prefs.getBoolean(StepTrackingForegroundService.PREF_IS_ACTIVE, false);

        JSObject ret = new JSObject();
        ret.put("steps", steps);
        ret.put("date", today);
        ret.put("isTracking", isActive);
        ret.put("isNative", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startBackgroundTracking(PluginCall call) {
        Context context = getContext();

        // Check activity recognition permission on Android 10+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("activityRecognition", call, "permissionCallback");
                return;
            }
        }

        startServiceInternal(call);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                call.reject("ACTIVITY_RECOGNITION permission was denied by user");
                return;
            }
        }
        startServiceInternal(call);
    }

    private void startServiceInternal(PluginCall call) {
        Context context = getContext();
        try {
            Intent serviceIntent = new Intent(context, StepTrackingForegroundService.class);
            serviceIntent.setAction(StepTrackingForegroundService.ACTION_START);
            ContextCompat.startForegroundService(context, serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Step tracking foreground service started");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start StepTrackingForegroundService", e);
            call.reject("Could not start foreground service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBackgroundTracking(PluginCall call) {
        Context context = getContext();
        try {
            Intent serviceIntent = new Intent(context, StepTrackingForegroundService.class);
            serviceIntent.setAction(StepTrackingForegroundService.ACTION_STOP);
            context.startService(serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Step tracking foreground service stopped");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop StepTrackingForegroundService", e);
            call.reject("Could not stop service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void resetSteps(PluginCall call) {
        Context context = getContext();
        try {
            SharedPreferences prefs = context.getSharedPreferences(
                StepTrackingForegroundService.PREFS_NAME,
                Context.MODE_PRIVATE
            );

            float lastReading = prefs.getFloat(StepTrackingForegroundService.PREF_LAST_HARDWARE_READING, -1f);
            prefs.edit()
                .putInt(StepTrackingForegroundService.PREF_TODAY_STEPS, 0)
                .putFloat(StepTrackingForegroundService.PREF_BASELINE_COUNTER, lastReading)
                .apply();

            try {
                Intent serviceIntent = new Intent(context, StepTrackingForegroundService.class);
                serviceIntent.setAction(StepTrackingForegroundService.ACTION_RESET);
                context.startService(serviceIntent);
            } catch (Exception ignored) {}

            notifyStepUpdateFromService(0, getTodayDateString());

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to reset steps in native plugin", e);
            call.reject("Could not reset steps: " + e.getMessage());
        }
    }

    private String getTodayDateString() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        return sdf.format(new Date());
    }
}
