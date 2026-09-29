export const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const STATUS_SWIPE_THRESHOLD_PX = 48;

export function getStatusExpiry(createdAt: Date | number = Date.now()): Date {
  const timestamp = createdAt instanceof Date ? createdAt.getTime() : createdAt;
  return new Date(timestamp + STATUS_LIFETIME_MS);
}

export function statusSwipeDirection(
  deltaX: number,
  threshold = STATUS_SWIPE_THRESHOLD_PX
): "next" | "previous" | null {
  if (deltaX <= -threshold) return "next";
  if (deltaX >= threshold) return "previous";
  return null;
}
