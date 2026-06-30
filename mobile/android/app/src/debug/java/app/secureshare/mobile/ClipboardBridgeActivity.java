package app.secureshare.mobile;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import java.nio.charset.StandardCharsets;

public class ClipboardBridgeActivity extends Activity {
    public static final String ACTION_GET = "app.secureshare.mobile.debug.GET_CLIPBOARD";
    public static final String ACTION_SET = "app.secureshare.mobile.debug.SET_CLIPBOARD";
    public static final String EXTRA_TEXT_BASE64 = "text_base64";
    public static final String LOG_TAG = "SecureShareClipboard";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ClipboardManager clipboard =
            (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        Intent intent = getIntent();

        if (clipboard == null || intent == null || intent.getAction() == null) {
            Log.e(LOG_TAG, "ERROR: Clipboard is unavailable");
            finish();
            return;
        }

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            switch (intent.getAction()) {
                case ACTION_SET:
                    setClipboard(clipboard, intent);
                    break;
                case ACTION_GET:
                    getClipboard(clipboard);
                    break;
                default:
                    Log.e(LOG_TAG, "ERROR: Unsupported clipboard action");
            }

            finish();
        }, 300);
    }

    private void getClipboard(ClipboardManager clipboard) {
        CharSequence text = "";

        if (clipboard.hasPrimaryClip() && clipboard.getPrimaryClip() != null) {
            ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
            text = item.coerceToText(this);
        }

        Log.i(LOG_TAG, "CLIPBOARD_BASE64:" + encode(text == null ? "" : text.toString()));
    }

    private void setClipboard(ClipboardManager clipboard, Intent intent) {
        String encodedText = intent.getStringExtra(EXTRA_TEXT_BASE64);

        if (encodedText == null) {
            Log.e(LOG_TAG, "ERROR: Missing clipboard text");
            return;
        }

        clipboard.setPrimaryClip(
            ClipData.newPlainText("Secure Share emulator clipboard", decode(encodedText))
        );
        Log.i(LOG_TAG, "OK");
    }

    private static String decode(String encodedText) {
        byte[] bytes = Base64.decode(encodedText, Base64.DEFAULT);

        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static String encode(String text) {
        return Base64.encodeToString(text.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
    }
}
