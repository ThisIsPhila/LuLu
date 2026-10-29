# Try LuLu on your phone

The easiest way to try the current LuLu demo is to [open the web app](https://lulu.thisisphila.co.za/) in your phone's browser. The mobile builds below are development previews and may lag behind the live site.

## Android

The Android APK is an older development preview for phones running Android 7.0 or later. Use the live web app for the current cloud features.

1. On your phone, [download the Android APK](https://github.com/ThisIsPhila/LuLu/releases/download/android-ios-preview-2026-10-27/LuLu-Android-preview.apk).
2. Open the downloaded file from your browser or Downloads app.
3. If Android asks, allow that app to install the preview, then tap **Install**.
4. Open LuLu and sign in or create an account.

This is a debug-signed test build, not a Play Store release. The complete experience on this exact build has not yet been verified on an Android device. The [release page](https://github.com/ThisIsPhila/LuLu/releases/tag/android-ios-preview-2026-10-27) also includes a checksum. The package was built from a development working tree and may differ from the source at the release tag.

## iPhone

There is no public iPhone download, TestFlight build or App Store release yet. You can use the [web app](https://lulu.thisisphila.co.za/) on your iPhone, or build the development app from source with a Mac and Xcode.

To build from source:

1. Install Node.js, npm and Xcode on your Mac, and connect your iPhone.
2. In the LuLu project folder, run `npm install` and `npm run native:sync`.
3. Run `npx cap open ios` to open the iOS project in Xcode.
4. In Xcode, select your Apple development team under **Signing & Capabilities**, choose your iPhone, and run the app. Follow any device trust or developer-mode prompts shown by Xcode and your iPhone.

Apple signing and device registration determine whether a development build can be installed. The existing registered-device build is held privately by the project owner; it is not a general iPhone download.

## Privacy model

On-device AI is on hold and is not used by the live cloud demo. Any optional model package is experimental; its download and processing still need device testing.
