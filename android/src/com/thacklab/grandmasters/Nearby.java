package com.thacklab.grandmasters;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.ParcelUuid;
import android.os.SystemClock;
import android.provider.Settings;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Finds other phones running Grandmasters close by, over Bluetooth LE. While
 * the Nearby screen is open, each phone advertises its friend code and name
 * (nothing else) and listens for other phones doing the same. Nothing ever
 * connects over Bluetooth; adding a friend and inviting them happen in the
 * web app, over the same encrypted relay as live games.
 *
 * Everything here runs on the main thread.
 */
final class Nearby {
    /** Marks a Grandmasters advertisement. */
    private static final ParcelUuid SERVICE = ParcelUuid.fromString("c0a82b71-7218-4441-9238-213d5b2dce8d");
    /** The Bluetooth SIG's company id for testing; its data carries [version, friend code, name]. */
    private static final int COMPANY = 0xFFFF;
    private static final int VERSION = 1;
    private static final int ID_LENGTH = 10;
    /** A scan response holds 31 bytes: 4 for the header, 1 + 10 for version and code, the rest for the name (with a byte to spare). */
    private static final int NAME_BYTES = 15;
    private static final String ID_PATTERN = "[0-9A-HJKMNP-TV-Z]{10}";
    static final int PERMISSION_REQUEST = 2;

    interface Events {
        void emit(JSONObject event);
    }

    private final Activity activity;
    private final Events events;
    private String id = "";
    private byte[] payload = new byte[0];
    /** The Nearby screen is open (stays true while the app is in the background). */
    private boolean wanted;
    private boolean running;
    private boolean asking;
    private BluetoothLeScanner scanner;
    private BluetoothLeAdvertiser advertiser;
    private BroadcastReceiver adapterState;
    private final Map<String, Long> lastSent = new HashMap<>();

    Nearby(Activity activity, Events events) {
        this.activity = activity;
        this.events = events;
    }

    /** The Nearby screen opened (or the name changed): advertise this code and name, and look for others. */
    void start(String id, String name) {
        if (!id.matches(ID_PATTERN)) return;
        this.id = id;
        byte[] n = nameBytes(name);
        payload = new byte[1 + ID_LENGTH + n.length];
        payload[0] = VERSION;
        System.arraycopy(id.getBytes(StandardCharsets.US_ASCII), 0, payload, 1, ID_LENGTH);
        System.arraycopy(n, 0, payload, 1 + ID_LENGTH, n.length);
        wanted = true;
        watchAdapter();
        stopRadio();
        resume();
    }

    /** The Nearby screen closed. */
    void stop() {
        wanted = false;
        stopRadio();
        if (adapterState != null) {
            try {
                activity.unregisterReceiver(adapterState);
            } catch (IllegalArgumentException ignored) {
                // already gone
            }
            adapterState = null;
        }
    }

    /** The app went to the background: stop advertising and scanning until it comes back. */
    void pause() {
        stopRadio();
    }

    /** The app came back, or something changed (permission granted, Bluetooth turned on): start if wanted. */
    void resume() {
        if (!wanted || running || asking) return;
        BluetoothManager manager = (BluetoothManager) activity.getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager == null ? null : manager.getAdapter();
        if (adapter == null || !activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
            wanted = false;
            status("unsupported");
            return;
        }
        String[] missing = missingPermissions();
        if (missing.length > 0) {
            asking = true;
            status("asking");
            activity.requestPermissions(missing, PERMISSION_REQUEST);
            return;
        }
        if (!adapter.isEnabled()) {
            status("bluetooth-off");
            return;
        }
        if (Build.VERSION.SDK_INT < 31 && !locationOn()) {
            status("location-off");
            return;
        }
        scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            status("bluetooth-off");
            return;
        }
        advertiser = adapter.isMultipleAdvertisementSupported() ? adapter.getBluetoothLeAdvertiser() : null;
        try {
            List<ScanFilter> filters = Collections.singletonList(new ScanFilter.Builder().setServiceUuid(SERVICE).build());
            ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
            scanner.startScan(filters, settings, scanCallback);
            running = true;
            if (advertiser != null) {
                AdvertiseSettings adv = new AdvertiseSettings.Builder()
                        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                        .setConnectable(false)
                        .setTimeout(0)
                        .build();
                AdvertiseData data = new AdvertiseData.Builder()
                        .addServiceUuid(SERVICE)
                        .setIncludeDeviceName(false)
                        .setIncludeTxPowerLevel(false)
                        .build();
                AdvertiseData response = new AdvertiseData.Builder()
                        .addManufacturerData(COMPANY, payload)
                        .setIncludeDeviceName(false)
                        .setIncludeTxPowerLevel(false)
                        .build();
                advertiser.startAdvertising(adv, data, response, advertiseCallback);
                status("on");
            } else {
                // Some older phones can scan but not advertise: they see others, but nobody sees them.
                status("on-hidden");
            }
        } catch (SecurityException | IllegalStateException e) {
            stopRadio();
            status("failed");
        }
    }

    void onPermissions(boolean granted) {
        asking = false;
        if (granted) {
            resume();
        } else {
            wanted = false;
            status("denied");
        }
    }

    /** Opens the system screen to fix what's stopping Nearby: "bluetooth", "location" or "app" (this app's permissions). */
    void openSettings(String which) {
        Intent intent;
        if ("bluetooth".equals(which)) intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        else if ("location".equals(which)) intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        else intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.fromParts("package", activity.getPackageName(), null));
        try {
            activity.startActivity(intent);
        } catch (Exception ignored) {
            // No such settings screen on this phone.
        }
    }

    private String[] missingPermissions() {
        List<String> need = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            need.add(Manifest.permission.BLUETOOTH_SCAN);
            need.add(Manifest.permission.BLUETOOTH_ADVERTISE);
        } else {
            // Android 11 and older only let apps scan for Bluetooth devices with the location permission.
            need.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        List<String> missing = new ArrayList<>();
        for (String p : need) if (activity.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
        return missing.toArray(new String[0]);
    }

    @SuppressWarnings("deprecation")
    private boolean locationOn() {
        LocationManager lm = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return true;
        if (Build.VERSION.SDK_INT >= 28) return lm.isLocationEnabled();
        try {
            return Settings.Secure.getInt(activity.getContentResolver(), Settings.Secure.LOCATION_MODE) != Settings.Secure.LOCATION_MODE_OFF;
        } catch (Settings.SettingNotFoundException e) {
            return true;
        }
    }

    /** Retries when Bluetooth is switched on from the quick settings, and notices it going off. */
    private void watchAdapter() {
        if (adapterState != null) return;
        adapterState = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if (state == BluetoothAdapter.STATE_ON) {
                    resume();
                } else if (state == BluetoothAdapter.STATE_OFF && wanted) {
                    stopRadio();
                    status("bluetooth-off");
                }
            }
        };
        IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
        if (Build.VERSION.SDK_INT >= 33) activity.registerReceiver(adapterState, filter, Context.RECEIVER_NOT_EXPORTED);
        else activity.registerReceiver(adapterState, filter);
    }

    private void stopRadio() {
        if (scanner != null) {
            try {
                scanner.stopScan(scanCallback);
            } catch (Exception ignored) {
                // Bluetooth already off
            }
        }
        if (advertiser != null) {
            try {
                advertiser.stopAdvertising(advertiseCallback);
            } catch (Exception ignored) {
                // Bluetooth already off
            }
        }
        scanner = null;
        advertiser = null;
        running = false;
    }

    private void status(String s) {
        try {
            events.emit(new JSONObject().put("type", "status").put("status", s));
        } catch (JSONException ignored) {
            // can't happen
        }
    }

    private void seen(ScanResult r) {
        ScanRecord record = r.getScanRecord();
        if (record == null) return;
        byte[] p = record.getManufacturerSpecificData(COMPANY);
        if (p == null || p.length < 1 + ID_LENGTH || p[0] != VERSION) return;
        String peer = new String(p, 1, ID_LENGTH, StandardCharsets.US_ASCII);
        if (!peer.matches(ID_PATTERN) || peer.equals(id)) return;
        long now = SystemClock.elapsedRealtime();
        Long last = lastSent.get(peer);
        if (last != null && now - last < 1500) return;
        lastSent.put(peer, now);
        String name = new String(p, 1 + ID_LENGTH, p.length - 1 - ID_LENGTH, StandardCharsets.UTF_8);
        try {
            events.emit(new JSONObject().put("type", "seen").put("id", peer).put("name", name).put("rssi", r.getRssi()));
        } catch (JSONException ignored) {
            // can't happen
        }
    }

    /** The name in at most NAME_BYTES bytes of UTF-8, cut between characters. */
    private static byte[] nameBytes(String name) {
        StringBuilder out = new StringBuilder();
        int bytes = 0;
        for (int i = 0; i < name.length(); ) {
            int cp = name.codePointAt(i);
            int size = new String(Character.toChars(cp)).getBytes(StandardCharsets.UTF_8).length;
            if (bytes + size > NAME_BYTES) break;
            out.appendCodePoint(cp);
            bytes += size;
            i += Character.charCount(cp);
        }
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(int callbackType, ScanResult result) {
            seen(result);
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            for (ScanResult r : results) seen(r);
        }

        @Override
        public void onScanFailed(int errorCode) {
            stopRadio();
            status("failed");
        }
    };

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartFailure(int errorCode) {
            if (errorCode == ADVERTISE_FAILED_ALREADY_STARTED) return;
            // Still scanning: this phone sees others, but they can't see it.
            if (running) status("on-hidden");
        }
    };
}
