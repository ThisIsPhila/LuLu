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
    override func capacitorDidLoad() { bridge?.registerPluginInstance(LuDictationPlugin()); bridge?.registerPluginInstance(LuAppearancePlugin()); bridge?.registerPluginInstance(NativeRefreshPlugin()) }
}

/// A compact, app-owned refresh affordance. UIKit's stock spinner is visually
/// too high in the WKWebView's rubber-band area and cannot show pull progress.
private final class RefreshIndicatorView: UIView {
    private let surface = UIView()
    private let ring = CAShapeLayer()
    private let icon = UIImageView()
    private let label = UILabel()
    private var isRotating = false

    override init(frame: CGRect) {
        super.init(frame: frame)

        isUserInteractionEnabled = false
        surface.backgroundColor = UIColor(red: 0.96, green: 0.94, blue: 0.90, alpha: 0.97)
        surface.layer.cornerRadius = 28
        surface.layer.cornerCurve = .continuous
        addSubview(surface)

        ring.fillColor = UIColor.clear.cgColor
        ring.strokeColor = UIColor(red: 0.35, green: 0.40, blue: 0.32, alpha: 0.8).cgColor
        ring.lineWidth = 2.2
        ring.lineCap = .round
        surface.layer.addSublayer(ring)

        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 16, weight: .medium)
        icon.tintColor = UIColor(red: 0.28, green: 0.32, blue: 0.25, alpha: 0.95)
        icon.contentMode = .center
        surface.addSubview(icon)

        label.font = UIFont.monospacedSystemFont(ofSize: 9, weight: .medium)
        label.textColor = UIColor(red: 0.30, green: 0.32, blue: 0.27, alpha: 0.85)
        label.textAlignment = .left
        label.attributedText = NSAttributedString(
            string: "PULL TO REFRESH",
            attributes: [.kern: 1.1],
        )
        surface.addSubview(label)

        update(distance: 0, refreshing: false)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        surface.frame = bounds
        let iconFrame = CGRect(x: 12, y: 12, width: 32, height: 32)
        icon.frame = iconFrame
        label.frame = CGRect(x: 52, y: 0, width: max(0, bounds.width - 62), height: bounds.height)
        ring.frame = CGRect(x: 12, y: 12, width: 32, height: 32)
        ring.path = UIBezierPath(ovalIn: ring.bounds.insetBy(dx: 1.5, dy: 1.5)).cgPath
    }

    func update(distance: CGFloat, refreshing: Bool) {
        let progress = min(max(distance / 96, 0), 1)
        ring.strokeEnd = refreshing ? 1 : progress
        alpha = refreshing ? 1 : min(1, max(0, distance / 12))

        if refreshing {
            icon.image = UIImage(systemName: "arrow.clockwise")
            label.attributedText = NSAttributedString(
                string: "UPDATING",
                attributes: [.kern: 1.1],
            )
            if !isRotating {
                isRotating = true
                let rotation = CABasicAnimation(keyPath: "transform.rotation")
                rotation.fromValue = 0
                rotation.toValue = Double.pi * 2
                rotation.duration = 0.8
                rotation.repeatCount = .infinity
                icon.layer.add(rotation, forKey: "refresh-rotation")
            }
            return
        }

        if isRotating {
            isRotating = false
            icon.layer.removeAnimation(forKey: "refresh-rotation")
        }
        let ready = progress >= 1
        icon.image = UIImage(systemName: ready ? "arrow.up" : "arrow.down")
        icon.transform = ready ? CGAffineTransform(rotationAngle: 0) : .identity
        label.attributedText = NSAttributedString(
            string: ready ? "RELEASE" : "PULL TO REFRESH",
            attributes: [.kern: 1.1],
        )
    }
}

/// Native pull-to-refresh for the three multi-post surfaces.
///
/// WKWebView can reliably expose a refresh control only on its own UIScrollView.
/// The web pages therefore use document scrolling on iOS, while this plugin
/// owns the gesture, progress spinner, and completion lifecycle.
@objc(NativeRefreshPlugin)
public final class NativeRefreshPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NativeRefreshPlugin"
    public let jsName = "NativeRefresh"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
    ]

    private var refreshControl: UIRefreshControl?
    private var indicatorView: RefreshIndicatorView?
    private var contentOffsetObservation: NSKeyValueObservation?
    private var tonePlayer: AVAudioPlayer?
    private var enabled = false
    private var refreshing = false
    private var maximumPullDistance: CGFloat = 0
    private var hapticStep = 0
    private var pullSoundPlayed = false
    private var pullGestureActive = false
    private let refreshSoundVolume: Float = 0.35

    @objc func haptic(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let feedback = UIImpactFeedbackGenerator(style: .medium)
            feedback.prepare()
            feedback.impactOccurred()
            call.resolve()
        }
    }

    @objc override public func load() {
        guard let scrollView = webView?.scrollView else { return }

        DispatchQueue.main.async { [weak self, weak scrollView] in
            guard let self, let scrollView else { return }

            let paper = UIColor(red: 250.0 / 255, green: 249.0 / 255, blue: 246.0 / 255, alpha: 1)
            self.webView?.isOpaque = false
            self.webView?.backgroundColor = paper
            self.webView?.superview?.backgroundColor = paper
            self.bridge?.viewController?.view.backgroundColor = paper
            scrollView.backgroundColor = paper

            scrollView.bounces = true
            scrollView.alwaysBounceVertical = true

            let control = UIRefreshControl()
            control.tintColor = .clear
            control.backgroundColor = .clear
            control.clipsToBounds = false
            control.addTarget(self, action: #selector(self.refreshValueChanged), for: .valueChanged)
            control.isEnabled = self.enabled

            let indicator = RefreshIndicatorView(frame: .zero)
            indicator.translatesAutoresizingMaskIntoConstraints = false
            control.addSubview(indicator)
            indicator.isHidden = true
            NSLayoutConstraint.activate([
                indicator.centerXAnchor.constraint(equalTo: control.centerXAnchor),
                indicator.centerYAnchor.constraint(equalTo: control.centerYAnchor, constant: 24),
                indicator.widthAnchor.constraint(equalToConstant: 142),
                indicator.heightAnchor.constraint(equalToConstant: 56),
            ])
            scrollView.refreshControl = control
            self.refreshControl = control
            self.indicatorView = indicator

            self.contentOffsetObservation = scrollView.observe(\.contentOffset, options: [.new]) { [weak self, weak scrollView] _, _ in
                guard let self, let scrollView else { return }
                self.handlePullProgress(for: scrollView)
            }
            scrollView.panGestureRecognizer.addTarget(self, action: #selector(self.handlePanGesture(_:)))
        }
    }

    @objc func setEnabled(_ call: CAPPluginCall) {
        let shouldEnable = call.getBool("enabled", false)

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.resolve()
                return
            }

            self.enabled = shouldEnable
            self.refreshControl?.isEnabled = shouldEnable
            if !shouldEnable {
                self.pullGestureActive = false
                self.refreshing = false
                self.refreshControl?.endRefreshing()
                self.resetPullProgress()
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.resolve()
                return
            }
            self.refreshing = false
            self.notifyListeners("progress", data: ["distance": 0, "refreshing": false])
            self.refreshControl?.endRefreshing()
            self.indicatorView?.update(distance: 0, refreshing: false)
            if !self.pullGestureActive {
                self.resetPullProgress()
            }
            call.resolve()
        }
    }

    @objc private func refreshValueChanged() {
        guard enabled, !refreshing else { return }

        refreshing = true
        indicatorView?.update(distance: 96, refreshing: true)
        notifyListeners("progress", data: ["distance": 96, "refreshing": true])
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
        notifyListeners("refresh", data: [:])
    }

    @objc private func handlePanGesture(_ recognizer: UIPanGestureRecognizer) {
        guard enabled else { return }

        switch recognizer.state {
        case .began:
            pullGestureActive = true
            maximumPullDistance = 0
            hapticStep = 0
            pullSoundPlayed = false
            indicatorView?.update(distance: 0, refreshing: false)
        case .ended:
            // Only finger release owns audio. Progress, threshold changes,
            // UIKit refresh callbacks, and completion never replay the cue.
            if pullGestureActive && maximumPullDistance >= 96 {
                playReleaseSoundIfNeeded()
            }
            pullGestureActive = false
            resetPullProgress()
        case .cancelled, .failed:
            pullGestureActive = false
            resetPullProgress()
        default:
            break
        }
    }

    private func handlePullProgress(for scrollView: UIScrollView) {
        guard enabled, !refreshing, scrollView.isDragging else { return }

        let distance = max(0, -(scrollView.contentOffset.y + scrollView.adjustedContentInset.top))
        maximumPullDistance = max(maximumPullDistance, distance)
        indicatorView?.update(distance: distance, refreshing: false)
        notifyListeners("progress", data: ["distance": Double(distance), "refreshing": false])

        let steps: [CGFloat] = [20, 42, 64, 80]
        while hapticStep < steps.count && distance >= steps[hapticStep] {
            // Three light ticks describe the pull; the native control's
            // value-changed callback supplies the single medium threshold tick.
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.prepare()
            generator.impactOccurred()
            hapticStep += 1
        }
        while hapticStep > 0 && distance < steps[hapticStep - 1] - 7 {
            hapticStep -= 1
        }
    }

    private func resetPullProgress() {
        if !refreshing { notifyListeners("progress", data: ["distance": 0, "refreshing": false]) }
        maximumPullDistance = 0
        hapticStep = 0
        pullSoundPlayed = false
        indicatorView?.update(distance: 0, refreshing: false)
    }

    /// Play the selected cue once on a qualifying finger release.
    private func playReleaseSoundIfNeeded() {
        guard !pullSoundPlayed else { return }

        pullSoundPlayed = true
        playSoundEffectThree()
    }

    /// Sound Effect 3 is the selected release cue. The bundled-player helper stops any
    /// earlier cue before starting it, while the gesture flag prevents repeats.
    private func playSoundEffectThree() {
        guard !playBundledSound(named: "pull-return") else { return }
        // Keep a matching fallback for an older install without the asset.
        playTone(frequencies: [440, 330], segmentDuration: 0.065, volume: 0.05)
    }

    /// Play an owner-supplied cue from the Capacitor `public` resource folder.
    /// The fallback tone remains available if an older install has not received
    /// the new assets yet.
    @discardableResult
    private func playBundledSound(named resourceName: String) -> Bool {
        let url = Bundle.main.url(
            forResource: resourceName,
            withExtension: "wav",
            subdirectory: "public/sounds",
        ) ?? Bundle.main.url(forResource: resourceName, withExtension: "wav")

        guard let url else { return false }

        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)

        tonePlayer?.stop()
        guard let player = try? AVAudioPlayer(contentsOf: url) else { return false }
        player.volume = refreshSoundVolume
        player.prepareToPlay()
        tonePlayer = player
        return player.play()
    }

    private func playTone(frequencies: [Double], segmentDuration: Double, volume: Float) {
        guard !frequencies.isEmpty else { return }

        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)

        let sampleRate = 44_100
        let duration = segmentDuration * Double(frequencies.count)
        let frameCount = Int(Double(sampleRate) * duration)
        let dataSize = frameCount * MemoryLayout<Int16>.size
        var wav = Data(capacity: 44 + dataSize)

        wav.append(contentsOf: Data("RIFF".utf8))
        appendLittleEndian(UInt32(36 + dataSize), to: &wav)
        wav.append(contentsOf: Data("WAVE".utf8))
        wav.append(contentsOf: Data("fmt ".utf8))
        appendLittleEndian(UInt32(16), to: &wav)
        appendLittleEndian(UInt16(1), to: &wav)
        appendLittleEndian(UInt16(1), to: &wav)
        appendLittleEndian(UInt32(sampleRate), to: &wav)
        appendLittleEndian(UInt32(sampleRate * MemoryLayout<Int16>.size), to: &wav)
        appendLittleEndian(UInt16(MemoryLayout<Int16>.size), to: &wav)
        appendLittleEndian(UInt16(16), to: &wav)
        wav.append(contentsOf: Data("data".utf8))
        appendLittleEndian(UInt32(dataSize), to: &wav)

        for frame in 0..<frameCount {
            let time = Double(frame) / Double(sampleRate)
            let segmentTime = time.truncatingRemainder(dividingBy: segmentDuration)
            let attack = min(1, segmentTime / 0.01)
            let release = min(1, (segmentDuration - segmentTime) / 0.025)
            let envelope = max(0, min(attack, release))
            let index = min(frequencies.count - 1, Int(time / segmentDuration))
            let frequency = frequencies[index]
            let sample = Int16(sin(2 * Double.pi * frequency * segmentTime) * Double(volume) * envelope * Double(Int16.max))
            appendLittleEndian(sample, to: &wav)
        }

        tonePlayer?.stop()
        tonePlayer = try? AVAudioPlayer(data: wav)
        tonePlayer?.volume = 1
        tonePlayer?.prepareToPlay()
        tonePlayer?.play()
    }

    private func appendLittleEndian<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
        var littleEndian = value.littleEndian
        withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }
}

