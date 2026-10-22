package com.voryn.app

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.*
import android.os.*
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.time.*

class StepTrackingService : Service(), SensorEventListener {
    private lateinit var manager: SensorManager
    private var owner: String? = null
    private var baseline = -1L
    private var lastDate: String? = null
    override fun onBind(intent: Intent?) = null
    override fun onCreate() { super.onCreate(); manager = getSystemService(Context.SENSOR_SERVICE) as SensorManager }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val control = getSharedPreferences("phone_health_control", MODE_PRIVATE)
        if (intent?.action == "STOP") {
            control.edit().putBoolean("enabled", false).apply(); stopSelf(); return START_NOT_STICKY
        }
        val nextOwner = intent?.getStringExtra("owner") ?: control.getString("owner", null)
        if (nextOwner == null || (intent == null && !control.getBoolean("enabled", false)) ||
            (Build.VERSION.SDK_INT >= 29 && ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED)) {
            stopSelf(); return START_NOT_STICKY
        }
        if (owner != nextOwner) {
            manager.unregisterListener(this)
            owner = nextOwner
            val prefs = getSharedPreferences("phone_health_$nextOwner", MODE_PRIVATE)
            val boot = Settings.Global.getInt(contentResolver, Settings.Global.BOOT_COUNT, -1)
            baseline = if (control.getBoolean("enabled", false) && control.getString("owner", null) == nextOwner && boot >= 0 && prefs.getInt("boot", -2) == boot) prefs.getLong("baseline", -1) else -1
            lastDate = prefs.getString("last_date", null)
            prefs.edit().putInt("boot", boot).apply()
        }
        val notifications = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notifications.createNotificationChannel(NotificationChannel("voryn_steps", "Passos no celular", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 1, Intent(this, StepTrackingService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, "voryn_steps").setSmallIcon(R.drawable.ic_steps_notification)
            .setContentTitle("Voryn · passos ativos").setContentText("Contando no celular, mesmo sem internet.")
            .setContentIntent(open).setOngoing(true).addAction(0, "Pausar", stop).build()
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(241, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
            else startForeground(241, notification)
            val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            if (sensor == null || !manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL, 10000000)) {
                control.edit().putBoolean("enabled", false).apply(); stopSelf(); return START_NOT_STICKY
            }
            control.edit().putString("owner", nextOwner).putBoolean("enabled", true).apply()
        } catch (_: Exception) { control.edit().putBoolean("enabled", false).apply(); stopSelf(); return START_NOT_STICKY }
        return START_STICKY
    }
    override fun onSensorChanged(event: SensorEvent) {
        val id = owner ?: return
        val current = event.values[0].toLong()
        val wallTime = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1000000
        val date = Instant.ofEpochMilli(wallTime).atZone(ZoneId.systemDefault()).toLocalDate().toString()
        val prefs = getSharedPreferences("phone_health_$id", MODE_PRIVATE)
        // First event establishes a baseline; never import steps taken before opting in.
        // Across midnight, discard the ambiguous gap instead of assigning it to the wrong day.
        val delta = if (baseline >= 0 && current >= baseline && date == lastDate) current - baseline else 0L
        prefs.edit().putLong("day_$date", prefs.getLong("day_$date", 0) + delta)
            .putLong("baseline", current).putString("last_date", date).apply()
        baseline = current; lastDate = date
    }
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onDestroy() { manager.unregisterListener(this); super.onDestroy() }
}

class StepBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = context.getSharedPreferences("phone_health_control", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("enabled", false)) return
        try { ContextCompat.startForegroundService(context, Intent(context, StepTrackingService::class.java).putExtra("owner", prefs.getString("owner", null))) }
        catch (_: Exception) { /* Some Android versions require opening the app after reboot. */ }
    }
}
