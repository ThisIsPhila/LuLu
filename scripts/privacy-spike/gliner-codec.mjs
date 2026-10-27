/** GLiNER Small v2.1, span-based uni-encoder, max_width=12. Spike only. */
export const labels = ['person', 'location', 'organization', 'email', 'phone number'];
export const fixtures = [
  'Nomsa Dlamini met Sipho at Acme Clinic in Midrand.',
  '🌿 Noe\u0308l met Nomsa Dlamini in Johannesburg. Email nomsa@example.invalid.',
  'I told David that I needed money for transport. David refused.',
];
export function prepare(text, tokenizer) {
  const words = [...text.matchAll(/[\p{L}\p{N}_]+(?:[-_][\p{L}\p{N}_]+)*|[^\s]/gu)].map(m => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
  if (!words.length || words.length > 384) throw new Error('Unsupported word count; spike never silently truncates');
  const prompt = [...labels.flatMap(label => ['<<ENT>>', label]), '<<SEP>>'];
  const ids = [1], mask = [0];
  for (const [i, word] of [...prompt, ...words.map(w => w.text)].entries()) {
    const encoded = tokenizer.encode(word, { add_special_tokens: false });
    const tokens = Array.isArray(encoded) ? encoded : encoded.ids;
    if (!tokens.length) throw new Error('Empty word encoding');
    ids.push(...tokens);
    mask.push(...tokens.map((_, j) => i >= prompt.length && j === 0 ? i - prompt.length + 1 : 0));
  }
  ids.push(2); mask.push(0);
  if (ids.length > 512) throw new Error('Spike subword budget exceeded; no silent truncation');
  const indices = [], valid = [];
  for (let start = 0; start < words.length; start++) for (let width = 0; width < 12; width++) {
    indices.push(start, start + width); valid.push(Number(start + width < words.length));
  }
  const tensor = (data, dims, type = 'int64') => ({ data, dims, type });
  return { words, inputs: {
    input_ids: tensor(ids, [1, ids.length]), attention_mask: tensor(ids.map(() => 1), [1, ids.length]),
    words_mask: tensor(mask, [1, ids.length]), text_lengths: tensor([words.length], [1, 1]),
    span_idx: tensor(indices, [1, words.length * 12, 2]), span_mask: tensor(valid, [1, words.length * 12], 'bool'),
  } };
}
export function decode(output, words, threshold = 0.5) {
  if (output.dims.join(',') !== [1, words.length, 12, labels.length].join(',')) throw new Error(`Unexpected output shape ${output.dims}`);
  const candidates = [];
  for (let start = 0; start < words.length; start++) for (let width = 0; width < 12 && start + width < words.length; width++) for (let label = 0; label < labels.length; label++) {
    const logit = output.data[(start * 12 + width) * labels.length + label];
    const confidence = 1 / (1 + Math.exp(-logit));
    if (confidence >= threshold) candidates.push({ start: words[start].start, end: words[start + width].end, label: labels[label], confidence, detector: 'gliner_small-v2.1-int8' });
  }
  const selected = [];
  for (const candidate of candidates.sort((a, b) => b.confidence - a.confidence)) {
    if (!selected.some(s => candidate.start < s.end && s.start < candidate.end)) selected.push(candidate);
  }
  return selected.sort((a, b) => a.start - b.start);
}
