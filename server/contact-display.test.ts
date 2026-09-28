import { describe, expect, it } from "vitest";
import {
  contactRatingStars,
  formatLastSeen,
  isConnectedContact,
} from "../client/src/lib/contact-display";

describe("Gridora chat last-seen labels", () => {
  const now = new Date("2026-09-27T12:00:00.000Z").getTime();

  it("labels a recent sign-in just now", () => {
    expect(formatLastSeen(new Date(now - 20_000), now)).toBe("Last seen just now");
  });

  it("uses compact minutes and hours for recent activity", () => {
    expect(formatLastSeen(new Date(now - 9 * 60_000), now)).toBe("Last seen 9m ago");
    expect(formatLastSeen(new Date(now - 3 * 60 * 60_000), now)).toBe("Last seen 3h ago");
  });

  it("shows yesterday or a calendar date for older activity", () => {
    expect(formatLastSeen(new Date("2026-09-26T10:30:00.000Z"), now)).toMatch(/^Last seen yesterday,/);
    expect(formatLastSeen(new Date("2026-08-01T10:30:00.000Z"), now)).toBe("Last seen Aug 1");
  });

  it("handles missing or invalid timestamps without claiming a user is online", () => {
    expect(formatLastSeen(null, now)).toBe("Last seen unavailable");
    expect(formatLastSeen("not-a-date", now)).toBe("Last seen unavailable");
  });

  it("uses Gridora's real rating score and the five-star onboarding rule", () => {
    expect(contactRatingStars(true, 0)).toBe(5);
    expect(contactRatingStars(false, 45)).toBe(5);
    expect(contactRatingStars(false, 31)).toBe(3);
    expect(contactRatingStars(false, null)).toBe(0);
  });

  it("dims only accepted contacts, not pending requests", () => {
    expect(isConnectedContact("connected")).toBe(true);
    expect(isConnectedContact("request_sent")).toBe(false);
    expect(isConnectedContact("connect")).toBe(false);
  });
});
