// swift-tools-version:5.9
import PackageDescription
let package = Package(name: "LuLuCompatibility", platforms: [.iOS(.v15)], dependencies: [
 .package(url: "https://github.com/ionic-team/capacitor-swift-pm", exact: "8.5.3"),
 .package(path: "../node_modules/@cantoo/capacitor-onnx")
])
