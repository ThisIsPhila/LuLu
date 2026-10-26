import { isNativePlatform } from './runtime';
import { createAudioCapture, type AudioCaptureOptions } from '../services/mediaCapture';

/** Keep the audio lifecycle shared while isolating native WebView media capabilities. */
export function createPlatformAudioCapture(options: AudioCaptureOptions) {
  if (!isNativePlatform()) return createAudioCapture(options);
  return createAudioCapture({
    ...options,
    getUserMedia: constraints => {
      const devices = navigator.mediaDevices;
      if (!devices?.getUserMedia) throw new Error('This native WebView does not provide microphone capture.');
      return devices.getUserMedia(constraints);
    },
    MediaRecorder: globalThis.MediaRecorder,
  });
}
