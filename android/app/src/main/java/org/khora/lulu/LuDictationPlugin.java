package org.khora.lulu;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "LuDictation", permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) })
public class LuDictationPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    private int generation = 0;
    private boolean permissionPending = false;
    private void clear() {
        permissionPending = false;
        generation++;
        if (recognizer != null) { recognizer.cancel(); recognizer.destroy(); recognizer = null; }
    }
    @PluginMethod public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            call.reject("On-device dictation is unavailable for this device. Use your keyboard microphone instead."); return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            permissionPending = true; requestPermissionForAlias("microphone", call, "microphoneResult"); return;
        }
        begin(call);
    }
    @PermissionCallback private void microphoneResult(PluginCall call) {
        if (!permissionPending) { call.reject("Dictation was cancelled."); return; }
        permissionPending = false;
        if (getPermissionState("microphone") != PermissionState.GRANTED) { call.reject("Microphone access was denied. Enable it in Android Settings."); return; }
        begin(call);
    }
    @RequiresApi(api = Build.VERSION_CODES.S)
    private void begin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                clear(); final int token = generation;
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    private void deliver(Bundle data, boolean last) {
                        if (token != generation || data == null) return;
                        ArrayList<String> results = data.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (results != null && !results.isEmpty()) { JSObject value = new JSObject(); value.put("text", results.get(0)); value.put("final", last); notifyListeners("result", value); }
                    }
                    public void onReadyForSpeech(Bundle params) {} public void onBeginningOfSpeech() {} public void onRmsChanged(float rms) {} public void onBufferReceived(byte[] buffer) {} public void onEndOfSpeech() {}
                    public void onError(int error) { if (token == generation) { JSObject value = new JSObject(); value.put("message", "On-device dictation stopped. Check microphone access and try again."); notifyListeners("failure", value); } }
                    public void onResults(Bundle results) { deliver(results, true); }
                    public void onPartialResults(Bundle results) { deliver(results, false); }
                    public void onEvent(int type, Bundle params) {}
                });
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
                recognizer.startListening(intent); call.resolve();
            } catch (Exception error) { clear(); call.reject("Could not start on-device dictation.", error); }
        });
    }
    @PluginMethod public void stop(PluginCall call) { getActivity().runOnUiThread(() -> { if (recognizer != null) recognizer.stopListening(); call.resolve(); }); }
    @PluginMethod public void cancel(PluginCall call) { getActivity().runOnUiThread(() -> { clear(); call.resolve(); }); }
    @Override protected void handleOnDestroy() { clear(); super.handleOnDestroy(); }
}
