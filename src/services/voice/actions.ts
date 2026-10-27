/** The voice model may suggest only these app destinations. The UI decides
 * whether navigation is safe and asks the user before taking action. */
export const voiceDestinations = ['home', 'journal', 'stories', 'library', 'reader', 'write', 'settings'] as const;
export type VoiceDestination = typeof voiceDestinations[number];
export type VoiceNavigationProposal = { destination: VoiceDestination };

export function parseNavigationProposal(input: unknown): VoiceNavigationProposal | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.destination !== 'string') return null;
  if (!voiceDestinations.some(destination => destination === record.destination)) return null;
  return { destination: record.destination as VoiceDestination };
}
