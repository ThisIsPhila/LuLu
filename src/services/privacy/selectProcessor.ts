import type { PrivacyProcessor, ProcessingMode } from './contracts.ts';

/** Selection never silently changes a local request into remote processing.
 * cloud_demo must be explicitly supplied by a separately labelled synthetic
 * demo flow. journal_only requires neither provider nor model installation. */
export function selectPrivacyProcessor(
  mode: ProcessingMode,
  providers: Partial<Record<'local' | 'cloud_demo', PrivacyProcessor>>,
): PrivacyProcessor | null {
  if (mode === 'journal_only') return null;
  const processor = providers[mode];
  if (!processor || processor.provider !== mode) throw new Error('Requested privacy provider unavailable');
  return processor;
}
