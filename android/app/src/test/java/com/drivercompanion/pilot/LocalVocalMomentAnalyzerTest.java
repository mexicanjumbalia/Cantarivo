package com.drivercompanion.pilot;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LocalVocalMomentAnalyzerTest {
    private static final int SAMPLE_RATE = 16000;

    @Test
    public void emitsOneEventAfterSustainedPeriodicSignal() {
        LocalVocalMomentAnalyzer analyzer = new LocalVocalMomentAnalyzer(SAMPLE_RATE);
        boolean sawStart = false;
        for (int frame = 0; frame < 4; frame++) {
            LocalVocalMomentAnalyzer.Result result = analyzer.analyze(sineFrame(160d), 1024);
            sawStart |= result.eventStarted;
        }
        assertTrue(sawStart);
    }

    @Test
    public void ignoresSilence() {
        LocalVocalMomentAnalyzer analyzer = new LocalVocalMomentAnalyzer(SAMPLE_RATE);
        LocalVocalMomentAnalyzer.Result result = analyzer.analyze(new short[1024], 1024);
        assertFalse(result.possibleVocal);
        assertFalse(result.eventStarted);
    }

    private short[] sineFrame(double frequencyHz) {
        short[] samples = new short[1024];
        for (int index = 0; index < samples.length; index++) {
            samples[index] = (short) (6000d * Math.sin(2d * Math.PI * frequencyHz * index / SAMPLE_RATE));
        }
        return samples;
    }
}
