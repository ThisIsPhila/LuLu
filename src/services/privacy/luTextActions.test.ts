import test from 'node:test';
import assert from 'node:assert/strict';
import { labelLuAction, matchLuTextAction, scrubForLu, validateScrubbedLuCommand } from './luTextActions.ts';

const entity = (text: string, value: string, label: string, from = 0) => {
  const start = text.indexOf(value, from);
  return { start, end: start + value.length, label, confidence: 0.9, detector: 'test' };
};

test('scrubs repeated and distinct mentions into generic category placeholders', () => {
  const source = 'Nandi asked Nandi to open Settings for the clinic in Midrand.';
  const entities = [
    entity(source, 'Nandi', 'person'),
    entity(source, 'Nandi', 'person', source.indexOf('Nandi') + 1),
    entity(source, 'clinic', 'organization'),
    entity(source, 'Midrand', 'location'),
  ];
  assert.equal(scrubForLu(source, entities), 'Person A asked Person A to open Settings for the Organization A in Place A.');
});

test('rejects invalid local detector spans rather than returning partially scrubbed text', () => {
  assert.throws(() => scrubForLu('Nandi', [{ start: -1, end: 3, label: 'person', confidence: 1, detector: 'test' }]));
  assert.throws(() => scrubForLu('Nandi', [
    { start: 0, end: 3, label: 'person', confidence: 1, detector: 'test' },
    { start: 2, end: 5, label: 'location', confidence: 1, detector: 'test' },
  ]));
});

test('matches only an allowlisted app action from scrubbed text', () => {
  const action = matchLuTextAction('Please open Settings for Person A and keep my note private.');
  assert.deepEqual(action, { kind: 'navigate', destination: 'settings' });
  assert.equal(labelLuAction(action!), 'Open Settings');
  assert.deepEqual(matchLuTextAction('Please start dictation for Person A'), { kind: 'quick', action: 'dictate' });
  assert.equal(matchLuTextAction('Tell me what Person A thinks'), null);
});

test('accepts only short commands with generic placeholders and rejects raw writing or identifiers', () => {
  assert.equal(validateScrubbedLuCommand('Open Settings for Person A'), 'Open Settings for Person A');
  assert.equal(validateScrubbedLuCommand('Please start dictation for Person B'), 'Please start dictation for Person B');
  assert.equal(validateScrubbedLuCommand('Open Settings for Jane Smith'), null);
  assert.equal(validateScrubbedLuCommand('Open Settings for jane@example.com'), null);
  assert.equal(validateScrubbedLuCommand('Jane told me to open settings'), null);
  assert.equal(validateScrubbedLuCommand('Open Settings and show Person A my story'), null);
});
