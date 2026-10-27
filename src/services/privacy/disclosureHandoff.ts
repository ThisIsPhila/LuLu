import { prepareDisclosureCopy, type DisclosureSnapshotInput } from '../../domain/privacy/decisions';
import type { DisclosureCopy } from '../../domain/privacy/types';

/** The UI supplies a live authorization check; this service has no network or persistence route. */
export interface DisclosureHandoffService {
  prepare(input: DisclosureSnapshotInput): Promise<DisclosureCopy>;
  copyReviewedText(copy: DisclosureCopy, manuallyReviewed: boolean): Promise<void>;
}

export function createLocalDisclosureHandoff(assertAuthorized: () => void): DisclosureHandoffService {
  return {
    async prepare(input) {
      assertAuthorized();
      const copy = await prepareDisclosureCopy(input);
      assertAuthorized();
      return copy;
    },
    async copyReviewedText(copy, manuallyReviewed) {
      if (!manuallyReviewed) throw new Error('Review the exact copy before continuing.');
      assertAuthorized();
      const verified = await prepareDisclosureCopy({
        snapshotId: copy.snapshotId,
        sourceRevisions: copy.sourceRevisions,
        purpose: copy.purpose,
        recipientId: copy.recipientId,
        text: copy.text,
      });
      if (verified.contentSha256 !== copy.contentSha256 || verified.snapshotSha256 !== copy.snapshotSha256) {
        throw new Error('The prepared copy changed. Review it again before continuing.');
      }
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
      assertAuthorized();
      await navigator.clipboard.writeText(copy.text);
    },
  };
}
