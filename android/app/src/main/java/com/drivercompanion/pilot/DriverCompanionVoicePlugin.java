package com.drivercompanion.pilot;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.Locale;

/**
 * A deliberately bounded preview adapter. It never creates the default
 * SpeechRecognizer, never forwards transcript text to JavaScript, and never
 * re-arms itself after a command. Android documents the standard recognizer as
 * unsuitable for continuous recognition, so an always-on wake word is outside
 * this pilot's authority.
 */
@CapacitorPlugin(
    name = "DriverCompanionVoice",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class DriverCompanionVoicePlugin extends Plugin implements DriverCompanionDriveService.Listener {
    private static final long COMMAND_WINDOW_MS = 7000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean listening;

    private final Runnable timeout = () -> {
        if (listening) {
            stopRecognizer();
            emitStatus("timed_out");
        }
    };

    @Override
    public void load() {
        DriverCompanionDriveService.setListener(this);
    }

    @PluginMethod
    public void getAvailability(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        result.put("available", supported);
        result.put("reason", supported ? "on_device_available" : "on_device_unavailable");
        call.resolve(result);
    }

    @PluginMethod
    public void startForDrive(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            resolveUnavailable(call, "android_12_or_newer_required");
            return;
        }
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            resolveUnavailable(call, "on_device_unavailable");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }
        beginListening(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            resolveUnavailable(call, "microphone_permission_denied");
            return;
        }
        beginListening(call);
    }

    @PluginMethod
    public void startLocalMeter(PluginCall call) {
        startBackgroundDrive(call);
    }

    @PluginMethod
    public void startBackgroundDrive(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneMeterPermissionCallback");
            return;
        }
        continueBackgroundDriveStart(call);
    }

    @PermissionCallback
    private void microphoneMeterPermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            resolveMeterUnavailable(call, "microphone_permission_denied");
            return;
        }
        continueBackgroundDriveStart(call);
    }

    private void continueBackgroundDriveStart(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") == PermissionState.PROMPT) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        beginBackgroundDrive(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        // Android permits a foreground service even when notification permission
        // is declined. The user will still see it in the system task manager.
        beginBackgroundDrive(call);
    }

    @PluginMethod
    public void stopLocalMeter(PluginCall call) {
        stopBackgroundService();
        call.resolve();
    }

    @PluginMethod
    public void stopBackgroundDrive(PluginCall call) {
        stopBackgroundService();
        call.resolve();
    }

    @PluginMethod
    public void pauseBackgroundDrive(PluginCall call) {
        sendDriveAction(DriverCompanionDriveService.ACTION_PAUSE, call.getData());
        call.resolve(snapshotToJs(DriverCompanionDriveService.getLatestSnapshot()));
    }

    @PluginMethod
    public void resumeBackgroundDrive(PluginCall call) {
        sendDriveAction(DriverCompanionDriveService.ACTION_RESUME, call.getData());
        call.resolve(snapshotToJs(DriverCompanionDriveService.getLatestSnapshot()));
    }

    @PluginMethod
    public void updateBackgroundDrive(PluginCall call) {
        sendDriveAction(DriverCompanionDriveService.ACTION_UPDATE, call.getData());
        call.resolve(snapshotToJs(DriverCompanionDriveService.getLatestSnapshot()));
    }

    @PluginMethod
    public void getBackgroundDriveState(PluginCall call) {
        call.resolve(snapshotToJs(DriverCompanionDriveService.getLatestSnapshot()));
    }

    @PluginMethod
    public void stopForDrive(PluginCall call) {
        stopRecognizer();
        emitStatus("stopped");
        call.resolve();
    }

    @Override
    protected void handleOnPause() {
        stopRecognizer();
        emitStatus("app_not_visible");
    }

    @Override
    protected void handleOnResume() {
        DriverCompanionDriveService.setListener(this);
    }

    @Override
    protected void handleOnDestroy() {
        stopRecognizer();
        DriverCompanionDriveService.setListener(null);
    }

    private void beginListening(PluginCall call) {
        stopRecognizer();
        sendDriveAction(DriverCompanionDriveService.ACTION_PAUSE, new JSObject());
        try {
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new CommandRecognitionListener());

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);

            listening = true;
            recognizer.startListening(intent);
            handler.postDelayed(timeout, COMMAND_WINDOW_MS);
            JSObject result = new JSObject();
            result.put("available", true);
            result.put("state", "listening");
            call.resolve(result);
            emitStatus("listening");
        } catch (UnsupportedOperationException error) {
            resolveUnavailable(call, "on_device_unavailable");
        } catch (Exception error) {
            stopRecognizer();
            resolveUnavailable(call, "start_failed");
        }
    }

    private void resolveUnavailable(PluginCall call, String reason) {
        stopRecognizer();
        JSObject result = new JSObject();
        result.put("available", false);
        result.put("reason", reason);
        call.resolve(result);
        emitStatus(reason);
    }

    private void stopRecognizer() {
        handler.removeCallbacks(timeout);
        listening = false;
        if (recognizer != null) {
            recognizer.cancel();
            recognizer.destroy();
            recognizer = null;
        }
    }

    private void resolveMeterUnavailable(PluginCall call, String reason) {
        JSObject result = new JSObject();
        result.put("active", false);
        result.put("reason", reason);
        call.resolve(result);
        emitMeterStatus(reason);
    }

    private void beginBackgroundDrive(PluginCall call) {
        stopRecognizer();
        Intent intent = driveIntent(DriverCompanionDriveService.ACTION_START, call.getData());
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            JSObject result = new JSObject();
            result.put("active", true);
            result.put("state", "starting");
            result.put("background", true);
            call.resolve(result);
        } catch (Exception error) {
            resolveMeterUnavailable(call, "foreground_service_start_failed");
        }
    }

    private Intent driveIntent(String action, JSObject data) {
        JSObject safeData = data == null ? new JSObject() : data;
        return new Intent(getContext(), DriverCompanionDriveService.class)
            .setAction(action)
            .putExtra(DriverCompanionDriveService.EXTRA_COMPANION_ALLOWED, safeData.optBoolean("companionAllowed", false))
            .putExtra(DriverCompanionDriveService.EXTRA_HARMONY_ENABLED, safeData.optBoolean("harmonyEnabled", false))
            .putExtra(DriverCompanionDriveService.EXTRA_AI_VOCAL_ENABLED, safeData.optBoolean("aiVocalEnabled", false))
            .putExtra(DriverCompanionDriveService.EXTRA_AUTO_RESUME, safeData.optBoolean("autoResume", true));
    }

    private void sendDriveAction(String action, JSObject data) {
        try {
            getContext().startService(driveIntent(action, data));
        } catch (Exception ignored) {
            // The web layer will observe the unchanged stopped snapshot.
        }
    }

    private void stopBackgroundService() {
        sendDriveAction(DriverCompanionDriveService.ACTION_STOP, new JSObject());
    }

    private JSObject snapshotToJs(DriverCompanionDriveService.Snapshot snapshot) {
        JSObject payload = new JSObject();
        payload.put("sessionActive", snapshot.sessionActive);
        payload.put("microphoneActive", snapshot.microphoneActive);
        payload.put("autoResume", snapshot.autoResume);
        payload.put("companionAllowed", snapshot.companionAllowed);
        payload.put("harmonyEnabled", snapshot.harmonyEnabled);
        payload.put("aiVocalEnabled", snapshot.aiVocalEnabled);
        payload.put("state", snapshot.state);
        payload.put("reason", snapshot.reason);
        payload.put("background", snapshot.sessionActive);
        return payload;
    }

    private void emitStatus(String state) {
        JSObject payload = new JSObject();
        payload.put("state", state);
        notifyListeners("voiceStatus", payload, true);
    }

    private void emitCommand(String command) {
        JSObject payload = new JSObject();
        payload.put("command", command);
        notifyListeners("voiceCommand", payload);
    }

    private void emitMeterStatus(String state) {
        JSObject payload = new JSObject();
        payload.put("state", state);
        notifyListeners("meterStatus", payload, true);
    }

    private void emitMeterLevel(double level) {
        JSObject payload = new JSObject();
        payload.put("level", level);
        notifyListeners("meterLevel", payload, true);
    }

    private void emitVocalMoment(int pitchHz, boolean outputHandled) {
        JSObject payload = new JSObject();
        // This is intentionally a narrow, non-identifying event. It does not mean
        // "the user is singing" and it includes no raw audio, transcript,
        // voiceprint, confidence, or song information. A coarsely rounded current
        // pitch is exposed only for a local, wordless harmony tone and is never
        // stored, profiled, or sent over the network.
        payload.put("kind", "possible_vocal_like_moment");
        payload.put("pitchHz", Math.max(70, Math.min(320, Math.round(pitchHz / 5f) * 5)));
        payload.put("outputHandledByService", outputHandled);
        notifyListeners("vocalMoment", payload, true);
    }

    @Override
    public void onDriveStatus(DriverCompanionDriveService.Snapshot snapshot) {
        JSObject payload = snapshotToJs(snapshot);
        notifyListeners("driveServiceStatus", payload, true);
        emitMeterStatus(snapshot.state);
    }

    @Override
    public void onMeterLevel(double level) {
        emitMeterLevel(level);
    }

    @Override
    public void onVocalMoment(int pitchHz, boolean outputHandled) {
        emitVocalMoment(pitchHz, outputHandled);
    }

    private String commandFromResults(ArrayList<String> results) {
        if (results == null) return null;
        for (String result : results) {
            String normalized = result.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
            switch (normalized) {
                case "companion join":
                    return "companion_join";
                case "companion quiet":
                    return "companion_quiet";
                case "end session":
                    return "end_drive";
                case "help":
                    return "help";
                default:
                    break;
            }
        }
        return null;
    }

    private final class CommandRecognitionListener implements RecognitionListener {
        @Override public void onReadyForSpeech(android.os.Bundle params) { emitStatus("listening"); }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rmsdB) { }
        @Override public void onBufferReceived(byte[] buffer) { }
        @Override public void onEndOfSpeech() { }
        @Override public void onPartialResults(android.os.Bundle partialResults) { }
        @Override public void onEvent(int eventType, android.os.Bundle params) { }

        @Override
        public void onResults(android.os.Bundle results) {
            if (!listening) return;
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            String command = commandFromResults(matches);
            stopRecognizer();
            if (command == null) {
                emitStatus("command_not_recognized");
                return;
            }
            emitCommand(command);
            emitStatus("command_complete");
        }

        @Override
        public void onError(int error) {
            if (!listening) return;
            stopRecognizer();
            emitStatus(error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE
                ? "language_unavailable"
                : "recognition_unavailable");
        }
    }
}
