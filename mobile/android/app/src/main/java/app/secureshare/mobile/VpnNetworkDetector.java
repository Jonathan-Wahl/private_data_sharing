package app.secureshare.mobile;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

final class VpnNetworkDetector {
    private VpnNetworkDetector() {}

    @SuppressWarnings("deprecation")
    static boolean isVpnActive(Context context) {
        ConnectivityManager connectivityManager =
                (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

        if (connectivityManager == null) {
            return false;
        }

        Network activeNetwork = connectivityManager.getActiveNetwork();

        if (hasVpnTransport(connectivityManager, activeNetwork)) {
            return true;
        }

        for (Network network : connectivityManager.getAllNetworks()) {
            if (activeNetwork != null && activeNetwork.equals(network)) {
                continue;
            }

            if (hasVpnTransport(connectivityManager, network)) {
                return true;
            }
        }

        return false;
    }

    private static boolean hasVpnTransport(ConnectivityManager connectivityManager, Network network) {
        if (network == null) {
            return false;
        }

        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);

        return capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
    }
}
