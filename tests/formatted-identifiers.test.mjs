import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFormattedPii, mergeDetectedEntities } from '../src/services/privacy/formattedIdentifiers.ts';

test('email, phone and valid time formats preserve exact UTF-16 spans after emoji', () => {
  const text = '🌿 Email a@example.invalid, call +27 (82) 123-4567 at 09:14.';
  const found = detectFormattedPii(text);
  assert.deepEqual(found.map(({ start, end, label, detector }) => ({
    value: text.slice(start, end), label, detector,
  })), [
    { value: 'a@example.invalid', label: 'email', detector: 'format check' },
    { value: '+27 (82) 123-4567', label: 'phone number', detector: 'format check' },
    { value: '09:14', label: 'time', detector: 'format check' },
  ]);
});

test('time recognition accepts bounded 12/24 hour forms and rejects invalid or partial times', () => {
  const text = '9:14 pm; 12:00 AM; 23:59; 24:00; 09:60; 13:14 pm; 1:99 am; 9:14:30; x09:14.';
  assert.deepEqual(detectFormattedPii(text).map(item => text.slice(item.start, item.end)), ['9:14 pm', '12:00 AM', '23:59']);
});

test('merging is confidence-first, format-wins-on-tie and yields a stable non-overlapping set', () => {
  const model = [
    { start: 0, end: 5, label: 'person', confidence: 0.8, detector: 'model' },
    { start: 4, end: 9, label: 'organization', confidence: 0.9, detector: 'model' },
    { start: 12, end: 15, label: 'place', confidence: 0.7, detector: 'model' },
  ];
  const formatted = [
    { start: 8, end: 11, label: 'time', confidence: 0.9, detector: 'format check' },
    { start: 12, end: 15, label: 'email', confidence: 0.7, detector: 'format check' },
  ];
  const merged = mergeDetectedEntities(model, formatted);
  assert.deepEqual(merged.map(({ start, end, label }) => ({ start, end, label })), [
    { start: 0, end: 5, label: 'person' },
    { start: 8, end: 11, label: 'time' },
    { start: 12, end: 15, label: 'email' },
  ]);
  assert.deepEqual(mergeDetectedEntities(model, formatted), merged);
});
