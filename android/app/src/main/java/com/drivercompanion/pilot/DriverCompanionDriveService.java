package com.drivercompanion.pilot;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioRecordingConfiguration;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import java.lang.ref.WeakReference;
import java.util.List;
import java.util.concurrent.Executor;

/**
 * User-started, session-scoped foreground service for local microphone analysis.
 *
 * Raw audio never leaves this process and is never written to storage. The
 * service yields the microphone and stops its own output for calls, reports
 * when Android silences its capture for another app, and can restore the same
 * singing session after the interruption ends.
 */
public final class DriverCompanionDriveService extends Service {
    public static final String ACTION_START = "com.drivercompanion.pilot.action.START_DRIVE";
    public static final String ACTION_UPDATE = "com.drivercompanion.pilot.action.UPDATE_DRIVE";
    public static final String ACTION_PAUSE = "com.drivercompanion.pilot.action.PAUSE_DRIVE";
    public static final String ACTION_RESUME = "com.drivercompanion.pilot.action.RESUME_DRIVE";
    public static final String ACTION_STOP = "com.drivercompanion.pilot.action.STOP_DRIVE";
    public static final String EXTRA_COMPANION_ALLOWED = "companionAllowed";
    public static final String EXTRA_HARMONY_ENABLED = "harmonyEnabled";
    public static final String EXTRA_AI_VOCAL_ENABLED = "aiVocalEnabled";
    public static final String EXTRA_AUTO_RESUME = "autoResume";

    private static final String CHANNEL_ID = "driver_companion_active_drive";
    private static final int NOTIFICATION_ID = 1042;
    private static final int SAMPLE_RATE = 16000;
    private static final long METER_EMIT_INTERVAL_MS = 120L;
    private static final long SYSTEM_MONITOR_INTERVAL_MS = 500L;
    private static final long RESUME_SETTLE_MS = 900L;
    private static final long CUE_COOLDOWN_MS = 2800L;

    public interface Listener {
        void onDriveStatus(Snapshot snapshot);
        void onMeterLevel(double level);
        void onVocalMoment(int pitchHz, boolean outputHandled);
    }

    public static final class Snapshot {
        public final boolean sessionActive;
        public final boolean microphoneActive;
        public final boolean autoResume;
        public final boolean companionAllowed;
        public final boolean harmonyEnabled;
        public final boolean aiVocalEnabled;
        public final String state;
        public final String reason;

        Snapshot(
            boolean sessionActive,
            boolean microphoneActive,
            boolean autoResume,
            boolean companionAllowed,
            boolean harmonyEnabled,
            boolean aiVocalEnabled,
            String state,
            String reason
        ) {
            this.sessionActive = sessionActive;
            this.microphoneActive = microphoneActive;
            this.autoResume = autoResume;
            this.companionAllowed = companionAllowed;
            this.harmonyEnabled = harmonyEnabled;
            this.aiVocalEnabled = aiVocalEnabled;
            this.state = state;
            this.reason = reason;
        }
    }

    private static volatile Snapshot latestSnapshot = new Snapshot(
        false, false, true, false, false, false, "stopped", "none"
    );
    private static WeakReference<Listener> listenerReference = new WeakReference<>(null);

    public static synchronized void setListener(@Nullable Listener listener) {
        listenerReference = new WeakReference<>(listener);
        if (listener != null) listener.onDriveStatus(latestSnapshot);
    }

    public static Snapshot getLatestSnapshot() {
        return latestSnapshot;
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private AudioManager audioManager;
    private NotificationManager notificationManager;
    private AudioRecord recorder;
    private AudioManager.AudioRecordingCallback recordingCallback;
    private Thread meterThread;
    private volatile boolean meterThreadActive;
    private volatile boolean recordingActive;
    private volatile LocalVocalMomentAnalyzer vocalAnalyzer;
    private AudioTrack activeCue;
    private AudioFocusRequest audioFocusRequest;
    private boolean legacyAudioFocusHeld;
    private boolean foregroundStarted;
    private boolean sessionActive;
    private boolean listeningRequested;
    private boolean interrupted;
    private boolean callInterruption;
    private boolean captureSilenced;
    private boolean autoResume = true;
    private boolean companionAllowed;
    private boolean harmonyEnabled;
    private boolean aiVocalEnabled;
    private String interruptionReason = "none";
    private long cueCooldownUntil;

    private final AudioManager.OnAudioFocusChangeListener focusChangeListener = focusChange -> {
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS
            || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT
            || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            handler.post(this::stopCompanionOutput);
        }
    };

    private final Runnable systemAudioMonitor = new Runnable() {
        @Override
        public void run() {
            monitorSystemAudio();
            if (sessionActive) handler.postDelayed(this, SYSTEM_MONITOR_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            endSession();
            return START_NOT_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            pauseFromUser();
            return START_NOT_STICKY;
        }
        if (ACTION_RESUME.equals(action)) {
            resumeFromUser();
            return START_NOT_STICKY;
        }
        if (ACTION_UPDATE.equals(action)) {
            applyOptions(intent);
            if (!companionAllowed || (!harmonyEnabled && !aiVocalEnabled)) stopCompanionOutput();
            publishCurrentState();
            return START_NOT_STICKY;
        }
        if (ACTION_START.equals(action)) {
            applyOptions(intent);
            startSession();
            return START_NOT_STICKY;
        }
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        stopCompanionOutput();
        stopRecorder();
        sessionActive = false;
        listeningRequested = false;
        foregroundStarted = false;
        publish("stopped", "service_destroyed");
        super.onDestroy();
    }

    private void applyOptions(Intent intent) {
        companionAllowed = intent.getBooleanExtra(EXTRA_COMPANION_ALLOWED, companionAllowed);
        harmonyEnabled = intent.getBooleanExtra(EXTRA_HARMONY_ENABLED, harmonyEnabled);
        aiVocalEnabled = intent.getBooleanExtra(EXTRA_AI_VOCAL_ENABLED, aiVocalEnabled);
        autoResume = intent.getBooleanExtra(EXTRA_AUTO_RESUME, autoResume);
    }

    private void startSession() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            publish("stopped", "microphone_permission_denied");
            stopSelf();
            return;
        }
        sessionActive = true;
        listeningRequested = true;
        interrupted = false;
        callInterruption = false;
        captureSilenced = false;
        interruptionReason = "none";
        startForegroundNow();
        handler.removeCallbacks(systemAudioMonitor);
        handler.post(systemAudioMonitor);
        if (isCallOrCommunicationActive()) {
            enterCallInterruption();
        } else {
            beginRecorder();
        }
    }

    private void pauseFromUser() {
        if (!sessionActive) return;
        listeningRequested = false;
        interrupted = false;
        callInterruption = false;
        captureSilenced = false;
        interruptionReason = "manual";
        stopCompanionOutput();
        stopRecorder();
        publish("paused", "manual");
    }

    private void resumeFromUser() {
        if (!sessionActive) return;
        listeningRequested = true;
        if (isCallOrCommunicationActive()) {
            enterCallInterruption();
            return;
        }
        interrupted = false;
        callInterruption = false;
        captureSilenced = false;
        interruptionReason = "none";
        beginRecorder();
    }

    private void endSession() {
        sessionActive = false;
        listeningRequested = false;
        interrupted = false;
        callInterruption = false;
        captureSilenced = false;
        interruptionReason = "none";
        handler.removeCallbacks(systemAudioMonitor);
        stopCompanionOutput();
        stopRecorder();
        foregroundStarted = false;
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        publish("stopped", "ended_by_user");
        stopSelf();
    }

    private void beginRecorder() {
        if (!sessionActive || !listeningRequested || interrupted || recordingActive) return;
        int minimumBuffer = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        );
        if (minimumBuffer <= 0) {
            publish("paused", "meter_unavailable");
            return;
        }
        try {
            AudioRecord.Builder builder = new AudioRecord.Builder()
                .setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build())
                .setBufferSizeInBytes(Math.max(minimumBuffer, SAMPLE_RATE / 4));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) builder.setPrivacySensitive(true);
            AudioRecord nextRecorder = builder.build();
            if (nextRecorder.getState() != AudioRecord.STATE_INITIALIZED) {
                nextRecorder.release();
                publish("paused", "meter_unavailable");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int audioSessionId = nextRecorder.getAudioSessionId();
                recordingCallback = new AudioManager.AudioRecordingCallback() {
                    @Override
                    public void onRecordingConfigChanged(List<AudioRecordingConfiguration> configurations) {
                        for (AudioRecordingConfiguration configuration : configurations) {
                            if (configuration.getClientAudioSessionId() == audioSessionId) {
                                handleCaptureSilenced(configuration.isClientSilenced());
                                return;
                            }
                        }
                    }
                };
                Executor mainExecutor = ContextCompat.getMainExecutor(this);
                nextRecorder.registerAudioRecordingCallback(mainExecutor, recordingCallback);
            }
            recorder = nextRecorder;
            vocalAnalyzer = new LocalVocalMomentAnalyzer(SAMPLE_RATE);
            meterThreadActive = true;
            nextRecorder.startRecording();
            recordingActive = true;
            meterThread = new Thread(() -> readMeter(nextRecorder), "DriverCompanionBackgroundMeter");
            meterThread.start();
            publish("active", "none");
        } catch (SecurityException error) {
            stopRecorder();
            publish("stopped", "microphone_permission_denied");
        } catch (Exception error) {
            stopRecorder();
            publish("paused", "meter_start_failed");
        }
    }

    private void readMeter(AudioRecord sourceRecorder) {
        short[] samples = new short[1024];
        long lastEmission = 0L;
        while (meterThreadActive && sourceRecorder == recorder) {
            int count = sourceRecorder.read(samples, 0, samples.length, AudioRecord.READ_BLOCKING);
            if (count < 0) {
                handler.post(() -> handleRecorderLost(sourceRecorder));
                break;
            }
            if (count == 0 || interrupted || captureSilenced) continue;
            LocalVocalMomentAnalyzer analyzer = vocalAnalyzer;
            LocalVocalMomentAnalyzer.Result analysis = analyzer == null ? null : analyzer.analyze(samples, count);
            if (analysis != null && analysis.eventStarted) {
                int pitch = Math.max(70, Math.min(320, Math.round(analysis.pitchHz / 5f) * 5));
                handler.post(() -> handleVocalMoment(pitch));
            }
            long now = System.currentTimeMillis();
            if (analysis == null || now - lastEmission < METER_EMIT_INTERVAL_MS) continue;
            lastEmission = now;
            double level = analysis.level;
            handler.post(() -> emitMeterLevel(level));
        }
    }

    private void handleRecorderLost(AudioRecord sourceRecorder) {
        if (sourceRecorder != recorder || !sessionActive) return;
        stopCompanionOutput();
        stopRecorder();
        listeningRequested = false;
        interrupted = false;
        publish("paused", "microphone_unavailable");
    }

    private synchronized void stopRecorder() {
        meterThreadActive = false;
        recordingActive = false;
        vocalAnalyzer = null;
        AudioRecord current = recorder;
        recorder = null;
        meterThread = null;
        if (current == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && recordingCallback != null) {
            try { current.unregisterAudioRecordingCallback(recordingCallback); } catch (Exception ignored) { }
        }
        recordingCallback = null;
        try { current.stop(); } catch (IllegalStateException ignored) { }
        current.release();
    }

    private void handleCaptureSilenced(boolean silenced) {
        if (!sessionActive || !listeningRequested || callInterruption) return;
        if (silenced) {
            captureSilenced = true;
            interrupted = true;
            interruptionReason = "microphone_in_use";
            stopCompanionOutput();
            publish("interrupted", interruptionReason);
            return;
        }
        if (!captureSilenced) return;
        captureSilenced = false;
        if (!autoResume) {
            listeningRequested = false;
            interrupted = false;
            stopRecorder();
            publish("paused", "resume_required");
            return;
        }
        interrupted = false;
        interruptionReason = "none";
        publish("active", "none");
    }

    private void monitorSystemAudio() {
        if (!sessionActive) return;
        boolean callActive = isCallOrCommunicationActive();
        if (callActive && !callInterruption) {
            enterCallInterruption();
            return;
        }
        if (!callActive && callInterruption) {
            callInterruption = false;
            if (!autoResume) {
                listeningRequested = false;
                interrupted = false;
                interruptionReason = "resume_required";
                publish("paused", interruptionReason);
                return;
            }
            interruptionReason = "call_ended";
            handler.postDelayed(() -> {
                if (!sessionActive || callInterruption || !listeningRequested) return;
                interrupted = false;
                interruptionReason = "none";
                beginRecorder();
            }, RESUME_SETTLE_MS);
        }
    }

    private boolean isCallOrCommunicationActive() {
        if (audioManager == null) return false;
        int mode = audioManager.getMode();
        return mode == AudioManager.MODE_IN_CALL
            || mode == AudioManager.MODE_IN_COMMUNICATION
            || mode == AudioManager.MODE_CALL_SCREENING
            || mode == AudioManager.MODE_RINGTONE;
    }

    private void enterCallInterruption() {
        if (!sessionActive) return;
        callInterruption = true;
        interrupted = true;
        captureSilenced = false;
        interruptionReason = "call_or_communication";
        stopCompanionOutput();
        stopRecorder();
        publish("interrupted", interruptionReason);
    }

    private void handleVocalMoment(int pitchHz) {
        if (!sessionActive || interrupted || !recordingActive) return;
        boolean outputHandled = companionAllowed && (aiVocalEnabled || harmonyEnabled);
        if (outputHandled) playCompanionCue(pitchHz, aiVocalEnabled);
        Listener listener = listenerReference.get();
        if (listener != null) listener.onVocalMoment(pitchHz, outputHandled);
    }

    private void playCompanionCue(int inputPitchHz, boolean aiStyle) {
        long now = System.currentTimeMillis();
        if (now < cueCooldownUntil || isCallOrCommunicationActive()) return;
        if (!requestTransientAudioFocus()) return;
        cueCooldownUntil = now + CUE_COOLDOWN_MS;
        stopActiveCueOnly();

        final int cueRate = 22050;
        final double durationSeconds = aiStyle ? 1.65d : 1.2d;
        final int sampleCount = (int) (cueRate * durationSeconds);
        final byte[] pcm = new byte[sampleCount * 2];
        final double semitones = aiStyle ? 3d : 4d;
        final double basePitch = Math.max(90d, Math.min(260d, inputPitchHz)) * Math.pow(2d, semitones / 12d);
        for (int i = 0; i < sampleCount; i++) {
            double time = i / (double) cueRate;
            double progress = i / (double) sampleCount;
            double envelope = Math.min(1d, progress / 0.08d) * Math.min(1d, (1d - progress) / 0.16d);
            double vibrato = 1d + 0.012d * Math.sin(2d * Math.PI * (aiStyle ? 5.7d : 5.1d) * time);
            double phase = 2d * Math.PI * basePitch * vibrato * time;
            double sample = Math.sin(phase) + 0.22d * Math.sin(phase * 2d);
            short value = (short) (sample * envelope * 2400d);
            pcm[i * 2] = (byte) (value & 0xff);
            pcm[i * 2 + 1] = (byte) ((value >> 8) & 0xff);
        }

        try {
            AudioTrack cue = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setAudioFormat(new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(cueRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setTransferMode(AudioTrack.MODE_STATIC)
                .setBufferSizeInBytes(pcm.length)
                .build();
            cue.write(pcm, 0, pcm.length);
            activeCue = cue;
            cue.play();
            handler.postDelayed(() -> {
                if (activeCue != cue) return;
                stopActiveCueOnly();
                abandonAudioFocus();
            }, (long) (durationSeconds * 1000d) + 160L);
        } catch (Exception error) {
            stopCompanionOutput();
        }
    }

    private boolean requestTransientAudioFocus() {
        if (audioManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setOnAudioFocusChangeListener(focusChangeListener, handler)
                .setWillPauseWhenDucked(true)
                .build();
            return audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        @SuppressWarnings("deprecation")
        int result = audioManager.requestAudioFocus(
            focusChangeListener,
            AudioManager.STREAM_MUSIC,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        );
        legacyAudioFocusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        return legacyAudioFocusHeld;
    }

    private void stopCompanionOutput() {
        stopActiveCueOnly();
        abandonAudioFocus();
    }

    private void stopActiveCueOnly() {
        AudioTrack cue = activeCue;
        activeCue = null;
        if (cue == null) return;
        try { cue.pause(); } catch (IllegalStateException ignored) { }
        try { cue.flush(); } catch (IllegalStateException ignored) { }
        cue.release();
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
            audioFocusRequest = null;
        } else if (legacyAudioFocusHeld) {
            @SuppressWarnings("deprecation")
            int ignored = audioManager.abandonAudioFocus(focusChangeListener);
            legacyAudioFocusHeld = false;
        }
    }

    private void emitMeterLevel(double level) {
        if (!sessionActive || interrupted || !recordingActive) return;
        Listener listener = listenerReference.get();
        if (listener != null) listener.onMeterLevel(level);
    }

    private void publishCurrentState() {
        Snapshot snapshot = latestSnapshot;
        publish(snapshot.state, snapshot.reason);
    }

    private void publish(String state, String reason) {
        Snapshot snapshot = new Snapshot(
            sessionActive,
            recordingActive && !interrupted && !captureSilenced,
            autoResume,
            companionAllowed,
            harmonyEnabled,
            aiVocalEnabled,
            state,
            reason
        );
        latestSnapshot = snapshot;
        Listener listener = listenerReference.get();
        if (listener != null) listener.onDriveStatus(snapshot);
        if (foregroundStarted && sessionActive) notificationManager.notify(NOTIFICATION_ID, buildNotification(snapshot));
    }

    private void startForegroundNow() {
        Snapshot starting = new Snapshot(
            true, false, autoResume, companionAllowed, harmonyEnabled, aiVocalEnabled, "starting", "none"
        );
        latestSnapshot = starting;
        int serviceTypes = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            serviceTypes = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                | ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
        }
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(starting), serviceTypes);
        foregroundStarted = true;
    }

    private Notification buildNotification(Snapshot snapshot) {
        boolean canPause = snapshot.microphoneActive;
        Intent primaryAction = new Intent(this, DriverCompanionDriveService.class)
            .setAction(canPause ? ACTION_PAUSE : ACTION_RESUME);
        PendingIntent primaryPendingIntent = PendingIntent.getService(
            this,
            canPause ? 2 : 3,
            primaryAction,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            4,
            new Intent(this, DriverCompanionDriveService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            1,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String content;
        if ("interrupted".equals(snapshot.state)) {
            content = snapshot.autoResume
                ? "Paused for a call or another microphone. Resumes automatically."
                : "Paused for an interruption. Tap Resume when ready.";
        } else if ("paused".equals(snapshot.state)) {
            content = "Local listening is paused. Your singing session is still open.";
        } else if ("starting".equals(snapshot.state)) {
            content = "Starting private, on-device listening…";
        } else {
            content = "Listening locally under other apps. No audio is saved or sent.";
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_drive_companion_notification)
            .setContentTitle("Cantarivo session active")
            .setContentText(content)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
            .setContentIntent(openPendingIntent)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .addAction(0, canPause ? "Pause listening" : "Resume listening", primaryPendingIntent)
            .addAction(0, "End session", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Active session controls",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Visible controls while Cantarivo uses the microphone during an active session.");
        channel.setSound(null, null);
        channel.enableVibration(false);
        notificationManager.createNotificationChannel(channel);
    }
}
