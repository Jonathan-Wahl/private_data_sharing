package app.secureshare.mobile;

import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "VpnStatus")
public class VpnStatusPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        VpnNetworkDetector.NetworkState networkState = VpnNetworkDetector.detect(getContext());
        JSObject result = new JSObject();
        result.put("active", networkState.vpnActive);
        result.put("internetValidated", networkState.internetValidated);
        result.put("online", networkState.online);
        result.put("platform", "android");
        result.put("serviceRunning", OpenVpnServiceState.isRunning(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_VPN_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

}
