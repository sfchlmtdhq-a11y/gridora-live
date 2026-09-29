import { describe, expect, it } from "vitest";
import {
  getStatusExpiry,
  STATUS_LIFETIME_MS,
  statusSwipeDirection,
} from "../shared/status-stories";

describe("Gridora status stories", () => {
  it("expires exactly 24 hours after publication", () => {
    const publishedAt = new Date("2026-09-28T12:34:56.000Z");
    expect(getStatusExpiry(publishedAt)).toEqual(
      new Date(publishedAt.getTime() + STATUS_LIFETIME_MS)
    );
  });

  it("supports left/right story gestures with a movement threshold", () => {
    expect(statusSwipeDirection(-60)).toBe("next");
    expect(statusSwipeDirection(60)).toBe("previous");
    expect(statusSwipeDirection(-20)).toBeNull();
    expect(statusSwipeDirection(20)).toBeNull();
  });
});
