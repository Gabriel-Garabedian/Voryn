package com.voryn.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileExport")
public class FileExportPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || call.getString("base64") == null) {
            call.reject("Arquivo inválido.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mimeType", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[/\\\\]", "-"));
        try {
            startActivityForResult(call, intent, "saved");
        } catch (Exception error) {
            call.reject("Não foi possível abrir o seletor de arquivos.", error);
        }
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Salvamento cancelado.", "CANCELLED");
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null) {
            call.reject("Nenhum destino selecionado.");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
            if (output == null) throw new java.io.IOException("Destino indisponível");
            output.write(Base64.decode(call.getString("base64"), Base64.DEFAULT));
            output.flush();
        } catch (Exception error) {
            call.reject("Não foi possível salvar o arquivo. Confira o espaço disponível e tente novamente.", error);
            return;
        }
        call.resolve();
    }
}
