import { LocalVault, type LocalVaultSession } from './vault/localVault.ts';
import { LocalMediaVault, type PutMediaOptions } from './vault/localMediaVault.ts';
import { capturePrivateText } from './privateCapture.ts';

/** Create-only access for a signed-in account. Reading remains in the verified private session. */
export function createPrivateCaptureWriter(ownerId: string, isAccountActive: () => boolean) {
  const session: LocalVaultSession = { ownerId, generation: () => 0, isUnlocked: isAccountActive };
  return {
    async text(body: string): Promise<void> { await capturePrivateText(new LocalVault(session), '', body); },
    async media(blob: Blob, options: PutMediaOptions): Promise<void> { await new LocalMediaVault(session).put(blob, options); },
  };
}
