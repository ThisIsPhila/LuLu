/** Private controls must only appear where private content is being viewed. */
export function isPrivateSurface(view: string, context: {
  editingOrdinaryEntry: boolean;
  hasPrivatePreview: boolean;
  readingProtectedEntry: boolean;
}): boolean {
  return view === 'local-private' || view === 'inspector' || view === 'enclave-writing' ||
    (view === 'compose' && !context.editingOrdinaryEntry) ||
    (view === 'privacy-demo' && context.hasPrivatePreview) ||
    (view === 'reader' && context.readingProtectedEntry);
}
