package app.secureshare.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VpnProfilePlugin.class);
        registerPlugin(VpnStatusPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
