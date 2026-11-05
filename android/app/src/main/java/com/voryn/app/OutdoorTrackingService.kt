package com.voryn.app

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.*
import android.os.*
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

class OutdoorTrackingService : Service(), LocationListener {
    companion object { var instance: OutdoorTrackingService? = null; private set }
    private lateinit var manager: LocationManager
    private lateinit var store: OutdoorStore
    private var row: JSONObject? = null
    private var baselineMs = 0L
    private var startedElapsed = 0L
    private var previous: OutdoorFix? = null
    private var segment = 0
    private val handler = Handler(Looper.getMainLooper())
    private val heartbeat = object : Runnable {
        override fun run() {
            if (row?.optString("status") != "recording") return
            try { store.save(snapshot()!!); handler.postDelayed(this, 10000) }
            catch (_: Exception) { fail("Gravação pausada: não foi possível salvar o trajeto. Verifique o espaço do aparelho.") }
        }
    }
    override fun onBind(intent: Intent?) = null
    override fun onCreate() {
        super.onCreate()
        manager = getSystemService(LOCATION_SERVICE) as LocationManager
        store = OutdoorStore(this)
        instance = this
    }
    fun snapshot(): JSONObject? = row?.let {
        JSONObject(it.toString()).apply {
            if (optString("status") == "recording") put("elapsedMs", baselineMs + SystemClock.elapsedRealtime() - startedElapsed)
        }
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "PAUSE") { pause(); return START_NOT_STICKY }
        @Suppress("DEPRECATION")
        val reply = intent?.getParcelableExtra<ResultReceiver>("reply")
        try {
            check(ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                "Autorize a localização precisa para gravar o trajeto."
            }
            check(manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) { "Ative a localização GPS do celular." }
            check(row?.optString("status") != "recording") { "Já existe uma atividade em andamento." }
            row = store.current() ?: error("Atividade não encontrada.")
            require(row!!.getString("userId") == intent?.getStringExtra("userId"))
            require(row!!.getString("status") == "paused")
            segment = row!!.optInt("segment") + 1
            row!!.put("segment", segment).put("status", "recording").put("error", "")
            baselineMs = row!!.getLong("elapsedMs")
            startedElapsed = SystemClock.elapsedRealtime()
            previous = null
            val notification = notification("GPS ativo · aguardando sinal")
            if (Build.VERSION.SDK_INT >= 29) startForeground(242, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            else startForeground(242, notification)
            manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000L, 0f, this, Looper.getMainLooper())
            store.save(row!!)
            handler.postDelayed(heartbeat, 10000)
            reply?.send(0, Bundle())
        } catch (error: Exception) {
            fail(error.message ?: "Não foi possível iniciar o GPS. Abra o Voryn e tente novamente.")
            reply?.send(1, Bundle().apply { putString("error", error.message) })
        }
        return START_NOT_STICKY
    }
    private fun notification(message: String): Notification {
        val notifications = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notifications.createNotificationChannel(NotificationChannel("voryn_outdoor", "Atividades ao ar livre", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 242, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val pause = PendingIntent.getService(this, 243, Intent(this, OutdoorTrackingService::class.java).setAction("PAUSE"), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, "voryn_outdoor").setSmallIcon(R.drawable.ic_steps_notification)
            .setContentTitle("Voryn · atividade ao ar livre").setContentText(message).setContentIntent(open).setOngoing(true)
            .addAction(0, "Pausar", pause).build()
    }
    fun pause(message: String = "") {
        row = snapshot()?.apply { put("status", "paused"); put("error", message) }
        manager.removeUpdates(this)
        handler.removeCallbacks(heartbeat)
        try { row?.let { store.save(it) } }
        finally { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
    }
    private fun fail(message: String) {
        try { pause(message) } catch (_: Exception) { /* The previous atomic snapshot remains available. */ }
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(244, notification(message).apply { flags = flags and Notification.FLAG_ONGOING_EVENT.inv() })
    }
    override fun onLocationChanged(location: Location) {
        val active = row ?: return
        if (active.optString("status") != "recording") return
        val age = SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos
        if (age < 0 || age > 15000000000L || !location.hasAccuracy()) return
        val fix = OutdoorFix(location.latitude, location.longitude, location.accuracy.toDouble(), location.elapsedRealtimeNanos / 1000000)
        if (!OutdoorMetrics.accepted(previous, fix, active.getString("sport"))) return
        val last = previous
        val gap = last != null && fix.time - last.time > 30000
        if (gap) segment += 1
        if (last != null && !gap) active.put("distanceMeters", active.getDouble("distanceMeters") + OutdoorMetrics.distance(last, fix))
        active.put("segment", segment).put("lastFixAt", System.currentTimeMillis()).put("accuracy", fix.accuracy)
        active.getJSONArray("points").put(JSONObject().put("lat", fix.lat).put("lon", fix.lon).put("time", location.time).put("segment", segment))
        previous = fix
        try {
            store.save(snapshot()!!)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(242, notification("Gravando trajeto · ${(active.getDouble("distanceMeters") / 1000).let { "%.2f".format(it) }} km"))
        } catch (_: Exception) { fail("Gravação pausada: não foi possível salvar o trajeto.") }
    }
    override fun onProviderDisabled(provider: String) { if (provider == LocationManager.GPS_PROVIDER) fail("GPS desligado. Ative a localização e retome a atividade.") }
    override fun onProviderEnabled(provider: String) {}
    @Deprecated("Legacy location callback")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onDestroy() {
        try { if (row?.optString("status") == "recording") pause("Gravação interrompida. Confira e retome a atividade.") }
        finally { manager.removeUpdates(this); handler.removeCallbacksAndMessages(null); instance = null; super.onDestroy() }
    }
}
