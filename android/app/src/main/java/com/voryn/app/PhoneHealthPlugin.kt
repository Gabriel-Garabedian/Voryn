package com.voryn.app

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.*
import java.time.*

@CapacitorPlugin(name = "PhoneHealth", permissions = [
    Permission(alias = "motion", strings = [Manifest.permission.ACTIVITY_RECOGNITION]),
    Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])
])
class PhoneHealthPlugin : Plugin() {
    private fun owner(call: PluginCall): String? {
        val id = call.getString("userId")
        if (id == null || !id.matches(Regex("[a-zA-Z0-9-]{1,80}"))) {
            call.reject("Entre na sua conta para acessar os registros do celular.")
            return null
        }
        return id
    }
    private fun usageAllowed(): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
    }
    @PluginMethod fun read(call: PluginCall) {
        val id = owner(call) ?: return
        val prefs = context.getSharedPreferences("phone_health_$id", Context.MODE_PRIVATE)
        val control = context.getSharedPreferences("phone_health_control", Context.MODE_PRIVATE)
        if (control.getBoolean("enabled", false) && control.getString("owner", null) != id) {
            control.edit().putBoolean("enabled", false).apply()
            context.stopService(Intent(context, StepTrackingService::class.java))
        }
        val sensor = (context.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        val days = JSArray()
        prefs.all.filterKeys { it.startsWith("day_") }.toSortedMap().forEach { (key, value) ->
            days.put(JSObject().put("date", key.removePrefix("day_")).put("steps", value).put("sources", JSObject().put("steps", "phone")))
        }
        call.resolve(JSObject().put("available", sensor != null).put("enabled", control.getBoolean("enabled", false) && control.getString("owner", null) == id)
            .put("usageAllowed", usageAllowed()).put("days", days))
    }
    @PluginMethod fun start(call: PluginCall) {
        owner(call) ?: return
        if (Build.VERSION.SDK_INT >= 29 && getPermissionState("motion") != PermissionState.GRANTED) {
            requestPermissionForAlias("motion", call, "motionResult"); return
        }
        requestNotificationsOrStart(call)
    }
    @PermissionCallback private fun motionResult(call: PluginCall) {
        if (getPermissionState("motion") != PermissionState.GRANTED) { call.reject("Autorize a atividade física para contar os passos."); return }
        requestNotificationsOrStart(call)
    }
    private fun requestNotificationsOrStart(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsResult"); return
        }
        begin(call)
    }
    @PermissionCallback private fun notificationsResult(call: PluginCall) { begin(call) }
    private fun begin(call: PluginCall) {
        val id = owner(call) ?: return
        val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        if (manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) == null) { call.reject("Este celular não disponibiliza um sensor de passos para o Voryn."); return }
        try {
            ContextCompat.startForegroundService(context, Intent(context, StepTrackingService::class.java).putExtra("owner", id))
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({ call.resolve() }, 400)
        } catch (e: Exception) { call.reject("Não foi possível iniciar os passos. Abra o Voryn e tente novamente.", e) }
    }
    @PluginMethod fun stop(call: PluginCall) {
        context.getSharedPreferences("phone_health_control", Context.MODE_PRIVATE).edit().putBoolean("enabled", false).apply()
        context.stopService(Intent(context, StepTrackingService::class.java))
        call.resolve()
    }
    @PluginMethod fun openSleepSettings(call: PluginCall) {
        try { activity.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)); call.resolve() }
        catch (e: Exception) { call.reject("Abra Configurações > Acesso especial > Acesso a dados de uso e autorize o Voryn.", e) }
    }
    @PluginMethod fun sleepCandidates(call: PluginCall) {
        owner(call) ?: return
        if (!usageAllowed()) { call.resolve(JSObject().put("candidates", JSArray())); return }
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val events = manager.queryEvents(now - 8L * 86400000L, now)
        val event = UsageEvents.Event()
        val zone = ZoneId.systemDefault()
        val longest = mutableMapOf<String, Pair<Long, Long>>()
        var off: Long? = null
        while (events != null && events.hasNextEvent()) {
            events.getNextEvent(event)
            // Only screen timestamps are used. App names and usage history are never retained.
            if (event.eventType == UsageEvents.Event.SCREEN_NON_INTERACTIVE && off == null) off = event.timeStamp
            if (event.eventType == UsageEvents.Event.SCREEN_INTERACTIVE) {
                val start = off; off = null
                if (start != null) {
                    val minutes = (event.timeStamp - start) / 60000
                    val bedtime = Instant.ofEpochMilli(start).atZone(zone)
                    val wake = Instant.ofEpochMilli(event.timeStamp).atZone(zone)
                    if (minutes in 180..840 && (bedtime.hour >= 18 || bedtime.hour <= 5) && wake.hour <= 12) {
                        val key = wake.toLocalDate().toString()
                        val previous = longest[key]
                        if (previous == null || event.timeStamp - start > previous.second - previous.first) longest[key] = Pair(start, event.timeStamp)
                    }
                }
            }
        }
        val candidates = JSArray()
        longest.toSortedMap(compareByDescending { it }).forEach { (date, pair) ->
            candidates.put(JSObject().put("date", date).put("sleep_start", Instant.ofEpochMilli(pair.first).toString())
                .put("sleep_end", Instant.ofEpochMilli(pair.second).toString()).put("value", (pair.second - pair.first) / 60000))
        }
        call.resolve(JSObject().put("candidates", candidates))
    }
}
