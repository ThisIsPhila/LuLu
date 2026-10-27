export type SwipeDirection = -1 | 1;

export function edgeSwipeDirection(x: number, width: number, index: number, length: number): SwipeDirection | null {
  const direction = x <= 30 ? -1 : x >= width - 30 ? 1 : 0;
  return direction && index + direction >= 0 && index + direction < length ? direction : null;
}

export function isCompletedEdgeSwipe(direction: SwipeDirection, dx: number, dy: number): boolean {
  return dx * -direction >= 75 && Math.abs(dy) < 65;
}
