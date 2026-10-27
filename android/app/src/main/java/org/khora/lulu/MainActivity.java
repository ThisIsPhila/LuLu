package org.khora.lulu;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LuDictationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
