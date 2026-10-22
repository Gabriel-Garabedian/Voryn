package com.voryn.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.aggregate.AggregateMetric
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var permissionCall: PluginCall? = null
    private lateinit var launcher: ActivityResultLauncher<Set<String>>
    private val types = linkedMapOf(
        "steps" to StepsRecord::class, "sleep" to SleepSessionRecord::class,
        "nutrition" to NutritionRecord::class, "water" to HydrationRecord::class,
        "weight" to WeightRecord::class
    )

    override fun load() {
        launcher = bridge.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
            permissionCall?.resolve(JSObject().put("granted", JSArray(it.toList())))
            permissionCall = null
        }
    }

    private fun run(call: PluginCall, block: suspend () -> JSObject) {
        scope.launch {
            try { call.resolve(withTimeout(25000) { block() }) }
            catch (e: TimeoutCancellationException) { call.reject("O Health Connect demorou para responder. Tente novamente.", "HEALTH_CONNECT_TIMEOUT") }
            catch (e: SecurityException) { call.reject("Permissão revogada. Conecte novamente ao Health Connect.", "PERMISSION_DENIED") }
            catch (e: Exception) { call.reject("Falha ao acessar o Health Connect (${e.javaClass.simpleName}). Confira as permissões e tente novamente.", "HEALTH_CONNECT_ERROR") }
        }
    }

    @PluginMethod
    fun status(call: PluginCall) = run(call) {
        val status = HealthConnectClient.getSdkStatus(context)
        val granted = if (status == HealthConnectClient.SDK_AVAILABLE)
            HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions() else emptySet()
        JSObject().put("available", status == HealthConnectClient.SDK_AVAILABLE)
            .put("needsUpdate", status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED)
            .put("permissions", JSArray(types.filter { HealthPermission.getReadPermission(it.value) in granted }.keys.toList()))
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        activity.runOnUiThread {
            if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
                call.reject("Instale ou atualize o Health Connect.", "UNAVAILABLE")
            } else if (permissionCall != null) {
                call.reject("Já existe uma solicitação de permissão aberta.")
            } else {
                permissionCall = call
                try {
                    launcher.launch(types.values.map { HealthPermission.getReadPermission(it) }.toSet())
                } catch (e: Exception) {
                    permissionCall = null
                    call.reject("Não foi possível abrir a autorização (${e.javaClass.simpleName}). Abra as permissões do Voryn no Health Connect.", "PERMISSION_LAUNCH_FAILED")
                }
            }
        }
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        activity.runOnUiThread {
            try {
                val available = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
                val intent = if (available && Build.VERSION.SDK_INT >= 34)
                    Intent("android.health.connect.action.MANAGE_HEALTH_PERMISSIONS").putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
                else if (available) Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                else Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"))
                try { activity.startActivity(intent) }
                catch (e: android.content.ActivityNotFoundException) {
                    activity.startActivity(HealthConnectClient.getHealthConnectManageDataIntent(context))
                }
                call.resolve()
            } catch (e: Exception) { call.reject("Abra o Health Connect nas configurações do Android e procure Voryn em Permissões de apps.") }
        }
    }

    @PluginMethod
    fun diagnose(call: PluginCall) = run(call) {
        val client = HealthConnectClient.getOrCreate(context)
        val granted = client.permissionController.getGrantedPermissions()
        val start = LocalDate.now().minusDays(6).atStartOfDay(ZoneId.systemDefault()).toInstant()
        val filter = TimeRangeFilter.between(start, Instant.now())
        val categories = JSArray()
        for ((key, type) in types) {
            val allowed = HealthPermission.getReadPermission(type) in granted
            val row = JSObject().put("category", key).put("allowed", allowed)
            if (allowed) {
                val page = client.readRecords(ReadRecordsRequest(type, filter, pageSize = 3))
                row.put("hasRecords", page.records.isNotEmpty())
                row.put("sources", JSArray(page.records.map { it.metadata.dataOrigin.packageName }.distinct()))
            }
            categories.put(row)
        }
        JSObject().put("categories", categories).put("checkedAt", Instant.now().toString())
    }

    @PluginMethod
    fun readSummary(call: PluginCall) = run(call) {
        val client = HealthConnectClient.getOrCreate(context)
        val granted = client.permissionController.getGrantedPermissions()
        val zone = ZoneId.systemDefault()
        val days = JSArray()
        val metrics = linkedMapOf<String, AggregateMetric<*>>(
            "steps" to StepsRecord.COUNT_TOTAL,
            "sleep" to SleepSessionRecord.SLEEP_DURATION_TOTAL,
            "water" to HydrationRecord.VOLUME_TOTAL,
            "nutrition" to NutritionRecord.ENERGY_TOTAL
        ).filterKeys { HealthPermission.getReadPermission(types.getValue(it)) in granted }
        // Re-read the window so provider corrections and deletions replace saved summaries.
        for (offset in 6 downTo 0) {
            val date = LocalDate.now(zone).minusDays(offset.toLong())
            val start = date.atStartOfDay(zone).toInstant()
            val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant(), Instant.now())
            val filter = TimeRangeFilter.between(start, end)
            val row = JSObject().put("date", date.toString()).put("timezone", zone.id)
            val permissions = JSArray()
            // Uma agregação por dia evita dezenas de chamadas e limites de leitura.
            if (metrics.isNotEmpty()) {
                val totals = client.aggregate(AggregateRequest(metrics.values.toSet(), filter))
                if ("steps" in metrics) row.put("steps", totals[StepsRecord.COUNT_TOTAL])
                if ("sleep" in metrics) row.put("sleep_minutes", totals[SleepSessionRecord.SLEEP_DURATION_TOTAL]?.toMinutes())
                if ("water" in metrics) row.put("water_ml", totals[HydrationRecord.VOLUME_TOTAL]?.inMilliliters)
                if ("nutrition" in metrics) row.put("nutrition_kcal", totals[NutritionRecord.ENERGY_TOTAL]?.inKilocalories)
            }
            for ((key, type) in types) {
                if (HealthPermission.getReadPermission(type) !in granted) continue
                permissions.put(key)
                when (key) {
                    "weight" -> {
                        var token: String? = null
                        var latest: WeightRecord? = null
                        do {
                            val page = client.readRecords(ReadRecordsRequest(WeightRecord::class, filter, pageToken = token))
                            for (record in page.records) if (latest == null || record.time > latest!!.time) latest = record
                            token = page.pageToken
                        } while (!token.isNullOrEmpty())
                        row.put("weight_kg", latest?.weight?.inKilograms)
                    }
                }
            }
            row.put("permissions", permissions)
            days.put(row)
        }
        JSObject().put("days", days).put("syncedAt", Instant.now().toString())
    }

    override fun handleOnResume() {
        notifyListeners("resume", JSObject())
    }

    override fun handleOnDestroy() {
        permissionCall?.reject("Solicitação cancelada.")
        permissionCall = null
        scope.cancel()
    }
}
