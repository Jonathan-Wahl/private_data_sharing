package app.secureshare.mobile;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.util.Base64;

import java.nio.charset.StandardCharsets;

public class ClipboardBridgeReceiver extends BroadcastReceiver {
    public static final String ACTION_GET = "app.secureshare.mobile.debug.GET_CLIPBOARD";
    public static final String ACTION_SET = "app.secureshare.mobile.debug.SET_CLIPBOARD";
    public static final String EXTRA_TEXT_BASE64 = "text_base64";

    @Override
    public void onReceive(Context context, Intent intent) {
        ClipboardManager clipboard =
            (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);

        if (clipboard == null || intent == null || intent.getAction() == null) {
            setResultCode(Activity.RESULT_CANCELED);
            setResultData("Clipboard is unavailable");
            return;
        }

        switch (intent.getAction()) {
            case ACTION_SET:
                setClipboard(clipboard, intent);
                return;
            case ACTION_GET:
                getClipboard(context, clipboard);
                return;
            default:
                setResultCode(Activity.RESULT_CANCELED);
                setResultData("Unsupported clipboard action");
        }
    }

    private void getClipboard(Context context, ClipboardManager clipboard) {
        CharSequence text = "";

        if (clipboard.hasPrimaryClip() && clipboard.getPrimaryClip() != null) {
            ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
            text = item.coerceToText(context);
        }

        setResultCode(Activity.RESULT_OK);
        setResultData(encode(text == null ? "" : text.toString()));
    }

    private void setClipboard(ClipboardManager clipboard, Intent intent) {
        String encodedText = intent.getStringExtra(EXTRA_TEXT_BASE64);

        if (encodedText == null) {
            setResultCode(Activity.RESULT_CANCELED);
            setResultData("Missing clipboard text");
            return;
        }

        clipboard.setPrimaryClip(
            ClipData.newPlainText("Secure Share emulator clipboard", decode(encodedText))
        );
        setResultCode(Activity.RESULT_OK);
        setResultData("OK");
    }

    private static String decode(String encodedText) {
        byte[] bytes = Base64.decode(encodedText, Base64.DEFAULT);

        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static String encode(String text) {
        return Base64.encodeToString(text.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
    }
}
