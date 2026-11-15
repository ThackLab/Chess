package com.thacklab.grandmasters;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Hosts the Grandmasters web app. Files are served from the APK's assets under a
 * secure https origin (so Web Workers, WebAssembly and IndexedDB all work
 * offline), and a small bridge covers what a WebView can't do on its own.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int FILE_REQUEST = 1;

    private WebView web;
    private ValueCallback<Uri[]> pendingFiles;
    private Nearby nearby;
    /** The talking coach's voice: Android's own text-to-speech, started the first time it speaks. */
    private TextToSpeech tts;
    private boolean ttsReady;
    private String[] pendingSpeech;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setTextZoom(100);
        web.setBackgroundColor(0xFF302E2B);
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new FileChooserClient());
        web.addJavascriptInterface(new Bridge(), "GrandmastersAndroid");
        setContentView(web);
        nearby = new Nearby(this, new Nearby.Events() {
            @Override
            public void emit(final JSONObject event) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        web.evaluateJavascript("window.__grandmastersNearby && window.__grandmastersNearby(" + JSONObject.quote(event.toString()) + ")", null);
                    }
                });
            }
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl(START_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        nearby.pause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        nearby.resume();
    }

    @Override
    protected void onDestroy() {
        nearby.stop();
        if (tts != null) tts.shutdown();
        web.destroy();
        super.onDestroy();
    }

    private void speechEvent(final String event, final String id) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                web.evaluateJavascript("window.__grandmastersSpeech && window.__grandmastersSpeech(" + JSONObject.quote(event) + "," + JSONObject.quote(id) + ")", null);
            }
        });
    }

    /** Australian English if the phone has it, then British, then whatever English it has. */
    private void pickVoice() {
        Locale[] wanted = { new Locale("en", "AU"), Locale.UK, Locale.US, Locale.ENGLISH };
        for (Locale l : wanted) {
            int r = tts.isLanguageAvailable(l);
            if (r >= TextToSpeech.LANG_AVAILABLE) {
                tts.setLanguage(l);
                return;
            }
        }
    }

    private void say(String text, float rate, float pitch, String id) {
        tts.setSpeechRate(rate);
        tts.setPitch(pitch);
        if (Build.VERSION.SDK_INT >= 21) {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
        } else {
            HashMap<String, String> params = new HashMap<>();
            params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
        }
    }

    private void startSpeech(final String text, final float rate, final float pitch, final String id) {
        if (tts != null && ttsReady) {
            say(text, rate, pitch, id);
            return;
        }
        pendingSpeech = new String[] { text, Float.toString(rate), Float.toString(pitch), id };
        if (tts != null) return;
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status != TextToSpeech.SUCCESS) {
                    if (pendingSpeech != null) speechEvent("error", pendingSpeech[3]);
                    pendingSpeech = null;
                    tts = null;
                    return;
                }
                ttsReady = true;
                pickVoice();
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        speechEvent("start", utteranceId);
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        speechEvent("done", utteranceId);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        speechEvent("error", utteranceId);
                    }
                });
                if (pendingSpeech != null) {
                    String[] p = pendingSpeech;
                    pendingSpeech = null;
                    say(p[0], Float.parseFloat(p[1]), Float.parseFloat(p[2]), p[3]);
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != Nearby.PERMISSION_REQUEST) return;
        boolean granted = results.length > 0;
        for (int r : results) granted &= r == PackageManager.PERMISSION_GRANTED;
        nearby.onPermissions(granted);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQUEST || pendingFiles == null) return;
        pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        pendingFiles = null;
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (!HOST.equals(url.getHost())) return null;
            String path = url.getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            headers.put("Access-Control-Allow-Origin", "*");
            try {
                InputStream in = getAssets().open("www" + path);
                String mime = mimeOf(path);
                String encoding = mime.startsWith("text/") || mime.endsWith("json") ? "utf-8" : null;
                WebResourceResponse res = new WebResourceResponse(mime, encoding, in);
                res.setResponseHeaders(headers);
                return res;
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (HOST.equals(url.getHost())) return false;
            // Everything else (help links, chess.com pages...) opens in the browser.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, url));
            } catch (ActivityNotFoundException ignored) {
                // No browser installed; ignore the click.
            }
            return true;
        }
    }

    private class FileChooserClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (pendingFiles != null) pendingFiles.onReceiveValue(null);
            pendingFiles = callback;
            // Accept attributes like ".pgn" are not MIME types, so let the user pick any file.
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            try {
                startActivityForResult(Intent.createChooser(intent, "Choose a file"), FILE_REQUEST);
            } catch (ActivityNotFoundException e) {
                pendingFiles = null;
                return false;
            }
            return true;
        }
    }

    /** Exposed to the page as window.GrandmastersAndroid. */
    private class Bridge {
        @JavascriptInterface
        public String saveFile(String name, String mime, String content) {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return "";
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        if (os == null) return "";
                        os.write(bytes);
                    }
                    return "Downloads/" + name;
                }
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) return "";
                File file = new File(dir, name);
                try (FileOutputStream os = new FileOutputStream(file)) {
                    os.write(bytes);
                }
                return file.getAbsolutePath();
            } catch (Exception e) {
                return "";
            }
        }

        /** Vibrates in a pattern of on/off milliseconds, e.g. "14,60,14". */
        @JavascriptInterface
        public void vibrate(String pattern) {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            try {
                String[] parts = pattern.split(",");
                long[] timings = new long[parts.length + 1];
                for (int i = 0; i < parts.length; i++) timings[i + 1] = Math.max(0, Math.min(1000, Long.parseLong(parts[i].trim())));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(timings, -1));
                else v.vibrate(timings, -1);
            } catch (NumberFormatException e) {
                // ignore a malformed pattern
            }
        }

        /** Starts looking for people nearby, showing this friend code, name and avatar to them (see Nearby). */
        @JavascriptInterface
        public void nearbyStart(final String id, final String name, final int avatar) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    nearby.start(id, name, avatar);
                }
            });
        }

        @JavascriptInterface
        public void nearbyStop() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    nearby.stop();
                }
            });
        }

        /** "bluetooth", "location" or "app". */
        @JavascriptInterface
        public void openSettings(final String which) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    nearby.openSettings(which);
                }
            });
        }

        /** Says text out loud (the talking coach); cuts off anything still being said. */
        @JavascriptInterface
        public void speak(final String text, final float rate, final float pitch, final String id) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startSpeech(text, Math.max(0.5f, Math.min(2f, rate)), Math.max(0.5f, Math.min(2f, pitch)), id);
                }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingSpeech = null;
                    if (tts != null && ttsReady) tts.stop();
                }
            });
        }

        @JavascriptInterface
        public void copyText(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Grandmasters", text));
                }
            });
        }
    }
}
