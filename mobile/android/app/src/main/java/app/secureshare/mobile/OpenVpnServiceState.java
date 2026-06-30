package app.secureshare.mobile;

import android.app.ActivityManager;
import android.content.Context;

final class OpenVpnServiceState {
    private static final String OPENVPN_SERVICE_CLASS = "com.tim.openvpn.service.OpenVPNService";

    private OpenVpnServiceState() {}

    @SuppressWarnings("deprecation")
    static boolean isRunning(Context context) {
        ActivityManager activityManager =
                (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);

        if (activityManager == null) {
            return false;
        }

        for (ActivityManager.RunningServiceInfo service : activityManager.getRunningServices(Integer.MAX_VALUE)) {
            if (service.service != null && OPENVPN_SERVICE_CLASS.equals(service.service.getClassName())) {
                return true;
            }
        }

        return false;
    }
}
