import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativePlatform } from './runtime';

export type CapturedImage = { blob: Blob; mimeType: string; format: string };

/** Capture an image through the native camera and return its original camera output bytes. */
export async function captureNativeImage(): Promise<CapturedImage | null> {
  if (!isNativePlatform()) return null;
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.Uri,
    quality: 100,
    allowEditing: false,
    correctOrientation: true,
    saveToGallery: false,
  });
  if (!photo.webPath) throw new Error('The camera returned no image data.');
  const response = await fetch(photo.webPath);
  if (!response.ok) throw new Error('The captured image could not be read.');
  const bytes = await response.arrayBuffer();
  const format = photo.format.toLowerCase();
  const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  return { blob: new Blob([bytes], { type: mimeType }), mimeType, format };
}
