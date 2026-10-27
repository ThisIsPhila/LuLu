import { useEffect, useState } from 'react';
import { listOrdinaryMedia } from '../services/ordinaryMedia';
import type { OrdinaryMediaRef } from '../domain/journal';

type Attachment = { ref: OrdinaryMediaRef; url: string };

export function useOrdinaryMediaAttachments(ownerId: string, entryId: string) {
  const [items, setItems] = useState<Attachment[]>([]);
  useEffect(() => {
    let active = true;
    let urls: string[] = [];
    setItems([]);
    void listOrdinaryMedia(ownerId, entryId).then(records => {
      if (!active) return;
      urls = records.map(record => URL.createObjectURL(record.blob));
      setItems(records.map((record, index) => ({ ref: record.ref, url: urls[index]! })));
    }).catch(() => { if (active) setItems([]); });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [ownerId, entryId]);
  return items;
}

export function OrdinaryMediaAttachments({ ownerId, entryId }: { ownerId: string; entryId: string }) {
  const items = useOrdinaryMediaAttachments(ownerId, entryId);
  if (!items.length) return null;
  return <section className="ordinary-media-attachments" aria-label="Entry attachments">
    {items.map(item => item.ref.kind === 'image'
      ? <img key={item.ref.id} src={item.url} alt={item.ref.name || 'Attached image'} />
      : <figure key={item.ref.id}>
          <figcaption>Voice note</figcaption>
          <audio controls preload="metadata" src={item.url} />
        </figure>)}
  </section>;
}
