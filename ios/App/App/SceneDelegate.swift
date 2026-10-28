import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = LuBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

import Speech
import AVFoundation

@objc(LuDictationPlugin)
public final class LuDictationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LuDictationPlugin"
    public let jsName = "LuDictation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var generation = 0
    private var tapInstalled = false

    private func clear() {
        generation += 1
        if engine.isRunning { engine.stop() }
        if tapInstalled { engine.inputNode.removeTap(onBus: 0); tapInstalled = false }
        request?.endAudio(); task?.cancel(); request = nil; task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.clear()
            let expected = self.generation
            guard let recognizer = SFSpeechRecognizer(), recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
                call.reject("On-device dictation is unavailable for the current language or device."); return
            }
            SFSpeechRecognizer.requestAuthorization { status in
                guard status == .authorized else { call.reject("Speech recognition permission was denied. Enable it in iPhone Settings."); return }
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    DispatchQueue.main.async {
                        guard expected == self.generation else { call.reject("Dictation was cancelled."); return }
                        guard granted else { call.reject("Microphone permission was denied. Enable it in iPhone Settings."); return }
                        do {
                            let audio = AVAudioSession.sharedInstance()
                            try audio.setCategory(.record, mode: .measurement, options: .duckOthers)
                            try audio.setActive(true, options: .notifyOthersOnDeactivation)
                            let input = self.engine.inputNode
                            let request = SFSpeechAudioBufferRecognitionRequest()
                            request.requiresOnDeviceRecognition = true
                            request.shouldReportPartialResults = true
                            self.request = request
                            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in request.append(buffer) }
                            self.tapInstalled = true
                            self.engine.prepare(); try self.engine.start()
                            self.task = recognizer.recognitionTask(with: request) { result, error in
                                guard expected == self.generation else { return }
                                if let result = result { self.notifyListeners("result", data: ["text": result.bestTranscription.formattedString, "final": result.isFinal]) }
                                if let error = error { self.notifyListeners("failure", data: ["message": error.localizedDescription]); DispatchQueue.main.async { self.clear() } }
                            }
                            call.resolve()
                        } catch { self.clear(); call.reject("Could not start on-device dictation: \(error.localizedDescription)") }
                    }
                }
            }
        }
    }
    @objc func stop(_ call: CAPPluginCall) { DispatchQueue.main.async { if self.engine.isRunning { self.engine.stop() }; if self.tapInstalled { self.engine.inputNode.removeTap(onBus: 0); self.tapInstalled = false }; self.request?.endAudio(); call.resolve() } }
    @objc func cancel(_ call: CAPPluginCall) { DispatchQueue.main.async { self.clear(); call.resolve() } }
}

@objc(LuAppearancePlugin)
public final class LuAppearancePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LuAppearancePlugin"
    public let jsName = "LuAppearance"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setIcon", returnType: CAPPluginReturnPromise)
    ]
    @objc func getIcon(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["name": UIApplication.shared.alternateIconName ?? "default", "supported": UIApplication.shared.supportsAlternateIcons]) }
    }
    @objc func setIcon(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "default"
        guard ["default", "LuLinen", "LuPaper", "LuLeafy"].contains(name) else { call.reject("Unknown app icon."); return }
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else { call.reject("App icon selection is unavailable on this device."); return }
            UIApplication.shared.setAlternateIconName(name == "default" ? nil : name) { error in
                if let error = error { call.reject(error.localizedDescription); return }
                let actual = UIApplication.shared.alternateIconName ?? "default"
                guard actual == name else { call.reject("iOS did not apply the selected icon. Please try again."); return }
                call.resolve(["name": actual])
            }
        }
    }
}

final class LuBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(LuDictationPlugin()); bridge?.registerPluginInstance(LuAppearancePlugin()) }
}
