package com.voryn.app

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class OutdoorStore(private val context: Context) {
    private val control = context.getSharedPreferences("outdoor_control", Context.MODE_PRIVATE)
    private fun file(owner: String, id: String): File {
        require(owner.matches(Regex("[a-zA-Z0-9-]{1,80}")) && id.matches(Regex("[a-zA-Z0-9-]{1,80}")))
        val directory = File(context.filesDir, "outdoor/$owner")
        check(directory.isDirectory || directory.mkdirs()) { "Não foi possível abrir o armazenamento das atividades." }
        return File(directory, "$id.json")
    }
    fun load(owner: String, id: String): JSONObject =
        JSONObject(AtomicFile(file(owner, id)).openRead().bufferedReader().use { it.readText() })

    fun save(row: JSONObject) {
        val atomic = AtomicFile(file(row.getString("userId"), row.getString("id")))
        val output = atomic.startWrite()
        try { output.write(row.toString().toByteArray(Charsets.UTF_8)); atomic.finishWrite(output) }
        catch (error: Exception) { atomic.failWrite(output); throw error }
    }
    fun current(): JSONObject? {
        val owner = control.getString("owner", null) ?: return null
        val id = control.getString("id", null) ?: return null
        return load(owner, id)
    }
    fun activate(row: JSONObject) {
        save(row)
        check(control.edit().putString("owner", row.getString("userId")).putString("id", row.getString("id")).commit())
    }
    fun clearActive() { check(control.edit().clear().commit()) }

    fun list(owner: String): JSONArray {
        val directory = file(owner, "inventory").parentFile!!
        val rows = directory.listFiles { f -> f.name.endsWith(".json") || f.name.endsWith(".json.bak") }
            ?.map { it.name.removeSuffix(".bak").removeSuffix(".json") }?.distinct()?.map { load(owner, it) }
            ?.filter { it.optString("status") == "finished" }?.sortedByDescending { it.getLong("startedAt") } ?: emptyList()
        return JSONArray(rows.map { row -> JSONObject(row.toString()).apply { remove("points") } })
    }
    fun delete(owner: String, id: String) {
        require(current()?.optString("id") != id) { "Finalize a atividade antes de excluí-la." }
        val target = file(owner, id)
        AtomicFile(target).delete()
        check(!target.exists() && !File(target.path + ".bak").exists()) { "Não foi possível excluir a atividade." }
    }
    fun deleteAll(owner: String) {
        val isActiveOwner = current()?.optString("userId") == owner
        if (isActiveOwner) clearActive()
        val directory = file(owner, "inventory").parentFile!!
        directory.listFiles()?.forEach { check(it.delete()) { "Não foi possível excluir os trajetos deste aparelho." } }
    }
}
