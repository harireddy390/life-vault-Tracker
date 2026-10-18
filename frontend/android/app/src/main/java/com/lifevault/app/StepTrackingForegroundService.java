package com.lifevault.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * True persistent foreground service for physical hardware step tracking.
 * Survives app closure, minimization, and removal from recent apps tray.
 */
public class StepTrackingForegroundService extends Service implements SensorEventListener {

    private static final String TAG = "StepTrackingService";
    public static final String CHANNEL_ID = "lifevault_step_tracker";
    public static final int NOTIFICATION_ID = 9901;

    public static final String PREFS_NAME = "LifeVaultStepTrackerPrefs";
    public static final String PREF_IS_ACTIVE = "pref_is_active";
    public static final String PREF_CURRENT_DATE = "pref_current_date";
    public static final String PREF_TODAY_STEPS = "pref_today_steps";
    public static final String PREF_BASELINE_COUNTER = "pref_baseline_counter";
    public static final String PREF_LAST_HARDWARE_READING = "pref_last_hardware_reading";

    public static final String ACTION_START = "com.lifevault.app.action.START_TRACKING";
    public static final String ACTION_STOP = "com.lifevault.app.action.STOP_TRACKING";
    public static final String ACTION_STEP_UPDATE = "com.lifevault.app.action.STEP_UPDATE";
    public static final String ACTION_RESET = "com.lifevault.app.action.RESET";

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;
    private PowerManager.WakeLock wakeLock;
    private SharedPreferences prefs;

    private int todaySteps = 0;
    private float baselineCounter = -1f;
    private float lastHardwareReading = -1f;
    private String currentDate = "";

    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentDate = getTodayDateString();

        // Restore persisted state
        String savedDate = prefs.getString(PREF_CURRENT_DATE, currentDate);
        if (currentDate.equals(savedDate)) {
            todaySteps = prefs.getInt(PREF_TODAY_STEPS, 0);
            baselineCounter = prefs.getFloat(PREF_BASELINE_COUNTER, -1f);
            lastHardwareReading = prefs.getFloat(PREF_LAST_HARDWARE_READING, -1f);
        } else {
            todaySteps = 0;
            baselineCounter = -1f;
            lastHardwareReading = -1f;
            saveStepState(currentDate, todaySteps, baselineCounter, lastHardwareReading);
        }

        createNotificationChannel();
        acquirePartialWakeLock();
        initSensors();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            stopTrackingService();
            return START_NOT_STICKY;
        }

        if (ACTION_RESET.equals(action)) {
            todaySteps = 0;
            if (lastHardwareReading > 0) {
                baselineCounter = lastHardwareReading;
            }
            saveStepState(currentDate, todaySteps, baselineCounter, lastHardwareReading);
            updateNotification(todaySteps);
            broadcastStepUpdate(todaySteps, currentDate);
            return START_STICKY;
        }

        // Start Foreground with persistent sticky notification
        Notification notification = buildForegroundNotification(todaySteps);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                if (Build.VERSION.SDK_INT >= 34) { // Android 14+ FOREGROUND_SERVICE_HEALTH
                    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            } catch (Exception e) {
                Log.w(TAG, "startForeground with type failed, falling back", e);
                startForeground(NOTIFICATION_ID, notification);
            }
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        prefs.edit().putBoolean(PREF_IS_ACTIVE, true).apply();
        registerSensorListeners();

        // START_STICKY instructs Android to recreate the service if killed by memory pressure
        return START_STICKY;
    }

    private void initSensors() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
        }
    }

    private void registerSensorListeners() {
        if (sensorManager == null) return;

        // Prioritize hardware step counter chip
        if (stepCounterSensor != null) {
            sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_UI);
            Log.i(TAG, "Hardware Step Counter sensor registered.");
        } else if (stepDetectorSensor != null) {
            sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_UI);
            Log.i(TAG, "Hardware Step Detector fallback sensor registered.");
        } else {
            Log.w(TAG, "No native hardware step sensor found on device.");
        }
    }

    private void unregisterSensorListeners() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        String today = getTodayDateString();

        // Check midnight day rollover
        if (!today.equals(currentDate)) {
            currentDate = today;
            todaySteps = 0;
            baselineCounter = -1f;
            lastHardwareReading = -1f;
        }

        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            float rawHardwareSteps = event.values[0];

            // Handle device reboot detection (counter restarts from low value)
            if (baselineCounter < 0 || (lastHardwareReading > 0 && rawHardwareSteps < lastHardwareReading)) {
                baselineCounter = rawHardwareSteps - todaySteps;
                if (baselineCounter < 0) baselineCounter = 0;
            }

            lastHardwareReading = rawHardwareSteps;
            int calculatedSteps = (int) (rawHardwareSteps - baselineCounter);
            if (calculatedSteps > todaySteps) {
                todaySteps = calculatedSteps;
                onStepsUpdated();
            }
        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            if (event.values[0] == 1.0f) {
                todaySteps++;
                onStepsUpdated();
            }
        }
    }

    private void onStepsUpdated() {
        saveStepState(currentDate, todaySteps, baselineCounter, lastHardwareReading);
        updateNotification(todaySteps);
        broadcastStepUpdate(todaySteps, currentDate);
    }

    private void broadcastStepUpdate(int steps, String date) {
        Intent intent = new Intent(ACTION_STEP_UPDATE);
        intent.setPackage(getPackageName());
        intent.putExtra("steps", steps);
        intent.putExtra("date", date);
        sendBroadcast(intent);

        // Notify Capacitor JS Plugin if bridge is active
        BackgroundStepPlugin.notifyStepUpdateFromService(steps, date);
    }

    private void saveStepState(String date, int steps, float baseline, float lastReading) {
        prefs.edit()
            .putString(PREF_CURRENT_DATE, date)
            .putInt(PREF_TODAY_STEPS, steps)
            .putFloat(PREF_BASELINE_COUNTER, baseline)
            .putFloat(PREF_LAST_HARDWARE_READING, lastReading)
            .apply();
    }

    private Notification buildForegroundNotification(int steps) {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String title = "LifeVault Step Tracker is active";
        String contentText = String.format(Locale.US, "Hardware sensor active • %,d steps today", steps);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_stat_directions_walk)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false);

        return builder.build();
    }

    private void updateNotification(int steps) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildForegroundNotification(steps));
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "LifeVault Step Tracker",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Maintains continuous hardware step counting in the background");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.enableLights(false);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void acquirePartialWakeLock() {
        if (wakeLock == null) {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LifeVault:StepTrackerWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(24 * 60 * 60 * 1000L); // 24 hours keepalive
            }
        }
    }

    private void releasePartialWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    private void stopTrackingService() {
        unregisterSensorListeners();
        releasePartialWakeLock();
        prefs.edit().putBoolean(PREF_IS_ACTIVE, false).apply();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        // App was swiped away from recent apps tray!
        // Because this is a Foreground Service, it persists.
        Log.i(TAG, "Recent apps swipe detected. StepTrackingForegroundService remains active.");
    }

    @Override
    public void onDestroy() {
        unregisterSensorListeners();
        releasePartialWakeLock();
        super.onDestroy();
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private String getTodayDateString() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        return sdf.format(new Date());
    }
}
