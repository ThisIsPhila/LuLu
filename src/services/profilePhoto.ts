import { decryptPrivate, encryptPrivate, type Envelope } from './backend/deviceVault';

const keyFor = (uid: string) => `lulu.profile-photo.v1.${encodeURIComponent(uid)}`;
const recordId = 'profile-photo';

/** Profile photos are encrypted and scoped to this account and device. */
export async function readProfilePhoto(uid: string): Promise<string> {
  try {
    const stored = localStorage.getItem(keyFor(uid));
    if (!stored) return '';
    const value = await decryptPrivate<unknown>(uid, recordId, JSON.parse(stored) as Envelope);
    return typeof value === 'string' && value.startsWith('data:image/jpeg;base64,') ? value : '';
  } catch { return ''; }
}
export async function writeProfilePhoto(uid: string, photo: string): Promise<void> {
  if (!photo.startsWith('data:image/jpeg;base64,')) throw new Error('Choose a valid image.');
  localStorage.setItem(keyFor(uid), JSON.stringify(await encryptPrivate(uid, recordId, photo)));
}
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx || !image.naturalWidth || !image.naturalHeight) throw new Error('Could not read this image.');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    return canvas.toDataURL('image/jpeg', .84);
  } finally { URL.revokeObjectURL(url); }
}
