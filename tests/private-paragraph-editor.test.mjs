import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('new empty private drafts invite writing while existing or locked content stays concealed', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  try {
    const { PrivateParagraphEditor } = await server.ssrLoadModule('/src/components/PrivateParagraphEditor.tsx');
    const render = (value, sessionUnlocked) => renderToStaticMarkup(React.createElement(PrivateParagraphEditor, {
      value, sessionUnlocked, onChange() {},
    }));
    const empty = render('', true);
    assert.match(empty, /<textarea[^>]*placeholder="Start writing…"/);
    assert.doesNotMatch(empty, /autofocus/i, 'opening a draft must not force the mobile keyboard');
    assert.doesNotMatch(empty, /Reveal paragraph 1/);

    const existing = render('Synthetic sensitive text', true);
    assert.match(existing, /Reveal paragraph 1/);
    assert.doesNotMatch(existing, /Synthetic sensitive text/);
    assert.doesNotMatch(existing, /<textarea/);

    const locked = render('', false);
    assert.match(locked, /Reveal paragraph 1/);
    assert.match(locked, /disabled/);
    assert.doesNotMatch(locked, /<textarea/);
  } finally {
    await server.close();
  }
});
