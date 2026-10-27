export type LibraryItemKind = 'note' | 'task';

export type LibraryItem = {
  id: string;
  kind: LibraryItemKind;
  title: string;
  body: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LibraryItemDraft = { title: string; body: string };

export function normalizeLibraryItemDraft(value: LibraryItemDraft): LibraryItemDraft {
  const title = value.title.trim();
  const body = value.body.trim();
  if (!title || title.length > 200) throw new TypeError('Add a title up to 200 characters.');
  if (body.length > 10000) throw new TypeError('Keep notes and task details under 10,000 characters.');
  return { title, body };
}
