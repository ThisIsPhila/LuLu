import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeSwipeDirection, isCompletedEdgeSwipe } from './edgeSwipe.ts';

test('edge navigation is available only where the internal history has a destination', () => {
  assert.equal(edgeSwipeDirection(10, 400, 1, 3), -1);
  assert.equal(edgeSwipeDirection(390, 400, 1, 3), 1);
  assert.equal(edgeSwipeDirection(10, 400, 0, 3), null);
  assert.equal(edgeSwipeDirection(390, 400, 2, 3), null);
  assert.equal(edgeSwipeDirection(200, 400, 1, 3), null);
});

test('swipe must travel toward the page centre and remain mostly horizontal', () => {
  assert.equal(isCompletedEdgeSwipe(-1, 90, 12), true);
  assert.equal(isCompletedEdgeSwipe(1, -90, -12), true);
  assert.equal(isCompletedEdgeSwipe(-1, -90, 12), false);
  assert.equal(isCompletedEdgeSwipe(1, -74, 12), false);
  assert.equal(isCompletedEdgeSwipe(1, -90, 65), false);
});
