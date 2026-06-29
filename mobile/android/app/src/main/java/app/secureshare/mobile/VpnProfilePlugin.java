package app.secureshare.mobile;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "VpnProfile")
public class VpnProfilePlugin extends Plugin {
    @PluginMethod
    public void openOpenVpnProfile(PluginCall call) {
        String config = call.getString("config");
        String fileName = call.getString("fileName", "vpn-profile.ovpn");

        if (config == null || config.isBlank()) {
            call.reject("This provider did not include an OpenVPN profile.");
            return;
        }

        try {
            File profilesDirectory = new File(getContext().getCacheDir(), "vpn-profiles");

            if (!profilesDirectory.exists() && !profilesDirectory.mkdirs()) {
                call.reject("Unable to prepare VPN profile storage.");
                return;
            }

            File profileFile = new File(profilesDirectory, safeFileName(fileName));

            try (FileOutputStream output = new FileOutputStream(profileFile, false)) {
                output.write(config.getBytes(StandardCharsets.UTF_8));
            }

            Uri profileUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    profileFile
            );
            Intent intent = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(profileUri, "application/x-openvpn-profile")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent chooser = Intent.createChooser(intent, "Open VPN profile")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(chooser);
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("Install an OpenVPN-compatible app to open this provider profile.");
        } catch (Exception error) {
            call.reject("Unable to open this VPN profile.", error);
        }
    }

    private String safeFileName(String fileName) {
        String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");

        return safeName.endsWith(".ovpn") ? safeName : safeName + ".ovpn";
    }
}
