# Try LuLu on your phone

The easiest way to try LuLu is to [open the web app](https://lulu.thisisphila.co.za/) in your phone's browser. The mobile builds below are development previews.

## Android

You can install the Android preview on a phone running Android 7.0 or later.

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

The optional privacy model is downloaded separately in LuLu's privacy settings. It needs about 192 MB of device storage. Model download and processing in the mobile previews still need device testing.
