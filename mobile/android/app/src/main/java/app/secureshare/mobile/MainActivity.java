package app.secureshare.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VpnStatusPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
