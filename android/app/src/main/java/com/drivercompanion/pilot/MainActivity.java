package com.drivercompanion.pilot;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriverCompanionVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
