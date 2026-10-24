import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  transform,
  initialEntities,
  recognised,
  detectEntitySpans,
  applyPerspectiveDistancing,
} from './transform.ts';

test('context and perspective remain coherent', () => {
  assert.equal(
    transform('David came to my home at 9pm and threatened me.', initialEntities),
    'John came to the Nest at Blue Moon and threatened her.'
  );
});

test('alias updates retain references', () => {
  assert.equal(
    transform(
      'David met David.',
      initialEntities.map((e) => (e.type === 'Person' ? { ...e, alias: 'Robin' } : e))
    ),
    'Robin met Robin.'
  );
});

test('replacement is literal and original stays unchanged', () => {
  const source = 'David came home';
  transform(source, initialEntities);
  assert.equal(source, 'David came home');
  assert.equal(
    transform('Ann arrived', [{ id: 'a', original: 'Ann', alias: '$&', type: 'Person' }]),
    '$& arrived'
  );
});

test('perspective distancing can be toggled independently', () => {
  const source = 'I met David at home.';
  const withDistancing = transform(source, initialEntities, { perspectiveDistancing: true });
  const withoutDistancing = transform(source, initialEntities, { perspectiveDistancing: false });

  assert.equal(withDistancing, 'She met John at the Nest.');
  assert.equal(withoutDistancing, 'I met John at the Nest.');
});

test('recognised mentions counts entities accurately', () => {
  const text = 'David went home. Then David left home at 9pm.';
  const rec = recognised(text, initialEntities);
  const david = rec.find((e) => e.original === 'David');
  const home = rec.find((e) => e.original === 'home');
  const evening = rec.find((e) => e.original === '9pm');

  assert.equal(david?.mentions, 2);
  assert.equal(home?.mentions, 2);
  assert.equal(evening?.mentions, 1);
});

test('detectEntitySpans identifies positions', () => {
  const text = 'David visited home';
  const spans = detectEntitySpans(text, initialEntities);
  assert.equal(spans.length, 2);
  assert.equal(spans[0].original, 'David');
  assert.equal(spans[0].alias, 'John');
  assert.equal(spans[1].original, 'home');
  assert.equal(spans[1].alias, 'the Nest');
});
