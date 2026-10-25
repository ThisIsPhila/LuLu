import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, KeyRound } from 'lucide-react';

const icons = { arrow: ArrowUpRight, key: KeyRound };

document.querySelectorAll<HTMLElement>('[data-lucide]').forEach((element) => {
  const Icon = icons[element.dataset.lucide as keyof typeof icons];
  if (!Icon) return;
  createRoot(element).render(<Icon size={element.dataset.lucide === 'key' ? 22 : 16} strokeWidth={1.7} aria-hidden="true" />);
});
