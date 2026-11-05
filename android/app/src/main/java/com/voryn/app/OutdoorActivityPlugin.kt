package com.voryn.app

import android.Manifest
import android.content.Intent
import android.os.*
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

@CapacitorPlugin(name = "OutdoorActivity", permissions = [
    Permission(alias = "location", strings = [Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION]),
    Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])
])
class OutdoorActivityPlugin : Plugin() {
    private fun owner(call: PluginCall): String {
        val id = call.getString("userId") ?: error("Entre na sua conta para acessar as atividades.")
        require(id.matches(Regex("[a-zA-Z0-9-]{1,80}"))) { "Conta inválida." }
        return id
    }
    private fun execute(call: PluginCall, action: () -> JSObject) {
        activity.runOnUiThread {
            try { call.resolve(action()) }
            catch (error: Exception) { call.reject(error.message ?: "Não foi possível acessar a atividade.", error) }
        }
    }
    private fun current(): JSONObject? {
        val store = OutdoorStore(context)
        val stored = store.current() ?: return null
        val active = OutdoorTrackingService.instance?.snapshot()?.takeIf { it.optString("id") == stored.optString("id") } ?: stored
        if (active.optString("status") == "finished") { store.clearActive(); return null }
        if (active.optString("status") == "recording" && OutdoorTrackingService.instance == null) {
            active.put("status", "paused").put("error", "O Android interrompeu a gravação. O último trecho salvo foi preservado; confira e retome.")
            store.save(active)
        }
        return active
    }
    @PluginMethod fun read(call: PluginCall) = execute(call) {
        val id = owner(call)
        var active = current()
        if (active != null && active.getString("userId") != id) {
            OutdoorTrackingService.instance?.pause("Gravação pausada ao trocar de conta.")
            active = null
        }
        JSObject().put("active", active ?: JSONObject.NULL).put("history", OutdoorStore(context).list(id))
    }
    @PluginMethod fun detail(call: PluginCall) = execute(call) {
        val row = OutdoorStore(context).load(owner(call), call.getString("id") ?: error("Atividade inválida."))
        JSObject.fromJSONObject(row)
    }
    @PluginMethod fun start(call: PluginCall) {
        try { owner(call) } catch (error: Exception) { call.reject(error.message); return }
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationResult"); return
        }
        notificationsOrBegin(call)
    }
    @PermissionCallback private fun locationResult(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Autorize a localização precisa nas permissões do Voryn para gravar o trajeto."); return
        }
        notificationsOrBegin(call)
    }
    private fun notificationsOrBegin(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsResult"); return
        }
        begin(call)
    }
    @PermissionCallback private fun notificationsResult(call: PluginCall) { begin(call) }
    private fun begin(call: PluginCall) {
        activity.runOnUiThread {
            try {
                val id = owner(call)
                val store = OutdoorStore(context)
                var active = current()
                if (active == null) {
                    val sport = call.getString("sport")
                    require(sport in listOf("running", "walking", "cycling")) { "Selecione corrida, caminhada ou ciclismo." }
                    active = JSONObject().put("id", UUID.randomUUID().toString()).put("userId", id).put("sport", sport)
                        .put("status", "paused").put("startedAt", System.currentTimeMillis()).put("elapsedMs", 0L)
                        .put("distanceMeters", 0.0).put("points", JSONArray()).put("error", "")
                    store.activate(active)
                }
                require(active.getString("userId") == id) { "Há uma atividade pendente em outra conta. Volte àquela conta para finalizá-la." }
                require(active.getString("status") == "paused") { "A atividade já está gravando." }
                val receiver = object : ResultReceiver(Handler(Looper.getMainLooper())) {
                    override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
                        if (resultCode == 0) call.resolve()
                        else call.reject(resultData?.getString("error") ?: "Não foi possível iniciar o GPS.")
                    }
                }
                ContextCompat.startForegroundService(context, Intent(context, OutdoorTrackingService::class.java).putExtra("userId", id).putExtra("reply", receiver))
            } catch (error: Exception) { call.reject(error.message ?: "Não foi possível iniciar a atividade.", error) }
        }
    }
    @PluginMethod fun pause(call: PluginCall) = execute(call) {
        val active = current()
        require(active == null || active.getString("userId") == owner(call)) { "Atividade de outra conta." }
        OutdoorTrackingService.instance?.pause()
        JSObject()
    }
    @PluginMethod fun finish(call: PluginCall) = execute(call) {
        val id = owner(call)
        val active = current() ?: error("Não há atividade em andamento.")
        require(active.getString("userId") == id)
        OutdoorTrackingService.instance?.pause()
        val store = OutdoorStore(context)
        val saved = store.current() ?: error("Atividade não encontrada.")
        saved.put("status", "finished").put("finishedAt", System.currentTimeMillis())
        store.save(saved)
        store.clearActive()
        JSObject.fromJSONObject(saved)
    }
    @PluginMethod fun delete(call: PluginCall) = execute(call) {
        OutdoorStore(context).delete(owner(call), call.getString("id") ?: error("Atividade inválida."))
        JSObject()
    }
    @PluginMethod fun stop(call: PluginCall) = execute(call) {
        OutdoorTrackingService.instance?.pause("Gravação pausada ao sair da conta.")
        JSObject()
    }
    @PluginMethod fun deleteAll(call: PluginCall) = execute(call) {
        val id = owner(call)
        if (current()?.optString("userId") == id) OutdoorTrackingService.instance?.pause()
        OutdoorStore(context).deleteAll(id)
        JSObject()
    }
}
