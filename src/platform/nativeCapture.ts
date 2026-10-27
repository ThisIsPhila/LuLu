import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { isNativePlatform } from './runtime';

export type CapturedImage = { blob: Blob; mimeType: string; format: string };

/** Read the file returned by Capacitor 8's native picker into the encrypted vault. */
export async function captureNativeImage(source: 'camera' | 'photos' = 'photos'): Promise<CapturedImage | null> {
  if (!isNativePlatform()) return null;
  const photo = source === 'camera'
    ? await Camera.takePhoto({ quality: 100, correctOrientation: false, editable: 'no', saveToGallery: false, includeMetadata: true })
    : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, editable: 'no', correctOrientation: false, quality: 100, includeMetadata: true })).results[0];
  if (!photo) return null;
  const path = photo.webPath || (photo.uri ? Capacitor.convertFileSrc(photo.uri) : '');
  if (!path) throw new Error('The selected image has no readable file path.');
  const response = await fetch(path);
  if (!response.ok) throw new Error('The selected image could not be read.');
  const bytes = await response.arrayBuffer();
  const format = (photo.metadata?.format || photo.uri?.split('.').pop()?.split('?')[0] || 'jpeg').toLowerCase();
  const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif', webp: 'image/webp', gif: 'image/gif' };
  const mimeType = types[format] || response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return { blob: new Blob([bytes], { type: mimeType }), mimeType, format };
}
