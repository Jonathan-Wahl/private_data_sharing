package app.secureshare.mobile;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

final class VpnNetworkDetector {
    private VpnNetworkDetector() {}

    @SuppressWarnings("deprecation")
    static boolean isVpnActive(Context context) {
        return detect(context).vpnActive;
    }

    @SuppressWarnings("deprecation")
    static NetworkState detect(Context context) {
        ConnectivityManager connectivityManager =
                (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

        if (connectivityManager == null) {
            return new NetworkState(false, false, false);
        }

        Network activeNetwork = connectivityManager.getActiveNetwork();
        NetworkState.Builder state = new NetworkState.Builder();

        state.include(capabilities(connectivityManager, activeNetwork));

        for (Network network : connectivityManager.getAllNetworks()) {
            if (activeNetwork != null && activeNetwork.equals(network)) {
                continue;
            }

            state.include(capabilities(connectivityManager, network));
        }

        return state.build();
    }

    private static NetworkCapabilities capabilities(
            ConnectivityManager connectivityManager,
            Network network
    ) {
        if (network == null) {
            return null;
        }

        return connectivityManager.getNetworkCapabilities(network);
    }

    static final class NetworkState {
        final boolean internetValidated;
        final boolean online;
        final boolean vpnActive;

        private NetworkState(boolean online, boolean internetValidated, boolean vpnActive) {
            this.online = online;
            this.internetValidated = internetValidated;
            this.vpnActive = vpnActive;
        }

        private static final class Builder {
            private boolean internetValidated;
            private boolean online;
            private boolean vpnActive;

            private void include(NetworkCapabilities capabilities) {
                if (capabilities == null) {
                    return;
                }

                online = online || capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                internetValidated =
                        internetValidated
                                || capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                vpnActive = vpnActive || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            }

            private NetworkState build() {
                return new NetworkState(online, internetValidated, vpnActive);
            }
        }
    }
}
