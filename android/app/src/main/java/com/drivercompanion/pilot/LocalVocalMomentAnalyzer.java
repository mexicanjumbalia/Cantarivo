package com.drivercompanion.pilot;

/**
 * A small, dependency-free signal gate for the singing companion preview.
 *
 * It measures energy and periodicity in a short microphone buffer.  It is not
 * a singing classifier, speaker identifier, lyric recognizer, or music
 * separator: a phone microphone cannot reliably distinguish the user from
 * background noise, other people, or music playing nearby. Its only
 * purpose is to flag a transient, possible vocal-like moment locally after a
 * user has explicitly enabled the microphone for the current session.
 *
 * The input buffer and all intermediate values remain in memory.  The caller
 * may expose a rounded pitch estimate and a boolean event, but must never
 * retain the samples or use this class for profiling.
 */
final class LocalVocalMomentAnalyzer {
    private static final int MIN_FREQUENCY_HZ = 70;
    private static final int MAX_FREQUENCY_HZ = 320;
    private static final double MIN_NORMALIZED_RMS = 0.018d;
    private static final double MIN_PERIODICITY = 0.56d;
    private static final int FRAMES_FOR_EVENT = 3;
    private static final int FRAMES_TO_END_EVENT = 3;

    static final class Result {
        final double level;
        final boolean possibleVocal;
        final boolean eventStarted;
        final boolean eventEnded;
        final int pitchHz;
        final double periodicity;

        Result(double level, boolean possibleVocal, boolean eventStarted, boolean eventEnded, int pitchHz, double periodicity) {
            this.level = level;
            this.possibleVocal = possibleVocal;
            this.eventStarted = eventStarted;
            this.eventEnded = eventEnded;
            this.pitchHz = pitchHz;
            this.periodicity = periodicity;
        }
    }

    private final int sampleRate;
    private int consecutiveVoicedFrames;
    private int consecutiveQuietFrames;
    private boolean eventActive;

    LocalVocalMomentAnalyzer(int sampleRate) {
        this.sampleRate = sampleRate;
    }

    void reset() {
        consecutiveVoicedFrames = 0;
        consecutiveQuietFrames = 0;
        eventActive = false;
    }

    Result analyze(short[] samples, int count) {
        if (count < 8) return new Result(0d, false, false, false, 0, 0d);

        double sum = 0d;
        double sumOfSquares = 0d;
        for (int index = 0; index < count; index++) {
            double sample = samples[index] / 32768d;
            sum += sample;
            sumOfSquares += sample * sample;
        }
        double mean = sum / count;
        double rms = Math.sqrt(sumOfSquares / count);
        double level = Math.min(1d, rms / 0.15d);

        int minLag = Math.max(1, sampleRate / MAX_FREQUENCY_HZ);
        int maxLag = Math.min(count / 2, sampleRate / MIN_FREQUENCY_HZ);
        double bestPeriodicity = 0d;
        int bestLag = 0;

        if (rms >= MIN_NORMALIZED_RMS && maxLag >= minLag) {
            for (int lag = minLag; lag <= maxLag; lag++) {
                double correlation = 0d;
                double leadingEnergy = 0d;
                double laggedEnergy = 0d;
                for (int index = lag; index < count; index++) {
                    double leading = (samples[index] / 32768d) - mean;
                    double lagged = (samples[index - lag] / 32768d) - mean;
                    correlation += leading * lagged;
                    leadingEnergy += leading * leading;
                    laggedEnergy += lagged * lagged;
                }
                if (leadingEnergy == 0d || laggedEnergy == 0d) continue;
                double normalized = correlation / Math.sqrt(leadingEnergy * laggedEnergy);
                if (normalized > bestPeriodicity) {
                    bestPeriodicity = normalized;
                    bestLag = lag;
                }
            }
        }

        boolean voicedFrame = rms >= MIN_NORMALIZED_RMS && bestPeriodicity >= MIN_PERIODICITY && bestLag > 0;
        if (voicedFrame) {
            consecutiveVoicedFrames++;
            consecutiveQuietFrames = 0;
        } else {
            consecutiveVoicedFrames = 0;
            if (eventActive) consecutiveQuietFrames++;
        }

        boolean eventStarted = !eventActive && consecutiveVoicedFrames >= FRAMES_FOR_EVENT;
        if (eventStarted) {
            eventActive = true;
            consecutiveQuietFrames = 0;
        }
        boolean eventEnded = eventActive && !voicedFrame && consecutiveQuietFrames >= FRAMES_TO_END_EVENT;
        if (eventEnded) {
            eventActive = false;
            consecutiveQuietFrames = 0;
        }

        int pitchHz = voicedFrame ? (int) Math.round((double) sampleRate / bestLag) : 0;
        return new Result(level, eventActive, eventStarted, eventEnded, pitchHz, bestPeriodicity);
    }
}
