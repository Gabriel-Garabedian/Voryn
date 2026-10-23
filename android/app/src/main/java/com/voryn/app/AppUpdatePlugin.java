package com.voryn.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    @PluginMethod
    public void info(PluginCall call) {
        try {
            android.content.pm.PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionCode", info.getLongVersionCode());
            result.put("versionName", info.versionName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível consultar a versão instalada.", error);
        }
    }

    @PluginMethod
    public void openDownload(PluginCall call) {
        String path = call.getString("apkPath", "");
        if (!path.matches("/downloads/[a-zA-Z0-9._-]+\\.apk")) {
            call.reject("Endereço de atualização inválido.");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://voryn-liard.vercel.app" + path));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Não foi possível abrir o navegador. Tente novamente.", error);
        }
    }
}
