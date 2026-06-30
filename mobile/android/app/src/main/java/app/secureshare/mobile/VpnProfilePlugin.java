package app.secureshare.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tim.openvpn.configuration.OpenVPNConfig;
import com.tim.openvpn.service.OpenVPNService;

@CapacitorPlugin(name = "VpnProfile")
public class VpnProfilePlugin extends Plugin {
    private String pendingConfig;

    @PluginMethod
    public void connectOpenVpnProfile(PluginCall call) {
        String config = call.getString("config");

        if (config == null || config.isBlank()) {
            call.reject("This provider did not include an OpenVPN profile.");
            return;
        }

        Intent permissionIntent = VpnService.prepare(getContext());

        if (permissionIntent != null) {
            pendingConfig = config;
            startActivityForResult(call, permissionIntent, "handleVpnPermissionResult");
            return;
        }

        startOpenVpn(config);
        call.resolve(statusResult("connecting"));
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        OpenVPNService.Companion.stopService(getContext());
        call.resolve(statusResult("disconnecting"));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(statusResult(profileState()));
    }

    @ActivityCallback
    private void handleVpnPermissionResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            pendingConfig = null;
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            pendingConfig = null;
            call.reject("VPN permission was not granted.");
            return;
        }

        String config = pendingConfig;
        pendingConfig = null;

        if (config == null || config.isBlank()) {
            call.reject("VPN profile was not available after permission approval.");
            return;
        }

        startOpenVpn(config);
        call.resolve(statusResult("connecting"));
    }

    private JSObject statusResult(String state) {
        JSObject result = new JSObject();

        result.put("active", isVpnActive());
        result.put("platform", "android");
        result.put("state", state);
        result.put("serviceRunning", OpenVpnServiceState.isRunning(getContext()));

        return result;
    }

    private String profileState() {
        if (isVpnActive()) {
            return "connected";
        }

        if (OpenVpnServiceState.isRunning(getContext())) {
            return "connecting";
        }

        return "disconnected";
    }

    private void startOpenVpn(String config) {
        OpenVPNService.Companion.startService(
                getContext(),
                new OpenVPNConfig(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        config
                ),
                null,
                new String[0]
        );
    }

    private boolean isVpnActive() {
        return VpnNetworkDetector.isVpnActive(getContext());
    }
}
