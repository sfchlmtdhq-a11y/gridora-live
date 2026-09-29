import { describe, expect, it } from "vitest";
import {
  aggregatePresence,
  PRESENCE_ONLINE_WINDOW_MS,
  sessionHash,
  sessionTabKey,
} from "./presence";
import { formatPresence } from "../shared/presence-display";

describe("Gridora presence", () => {
  const now = new Date("2026-09-28T22:00:00.000Z").getTime();

  it("keeps a user online while any one of their tabs is actively heartbeating", () => {
    const rows = [
      { userId: 4, isOnline: false, lastSeenAt: new Date(now - 2_000) },
      { userId: 4, isOnline: true, lastSeenAt: new Date(now - 10_000) },
    ];
    expect(aggregatePresence(rows, now).get(4)).toEqual({
      isOnline: true,
      lastSeenAt: new Date(now - 2_000),
    });
  });

  it("treats expired heartbeats as offline and preserves the latest seen timestamp", () => {
    const rows = [
      { userId: 9, isOnline: true, lastSeenAt: new Date(now - PRESENCE_ONLINE_WINDOW_MS - 1) },
      { userId: 9, isOnline: false, lastSeenAt: new Date(now - 8_000) },
    ];
    expect(aggregatePresence(rows, now).get(9)).toEqual({
      isOnline: false,
      lastSeenAt: new Date(now - 8_000),
    });
  });

  it("formats online and exact local last-seen timestamps without relative rounding", () => {
    const leftAt = new Date("2026-09-28T21:17:43.000Z");
    expect(formatPresence(true, leftAt, "en-GB")).toBe("Online");
    expect(formatPresence(false, leftAt, "en-GB")).toContain("21:17:43");
    expect(formatPresence(false, null, "en-GB")).toBe("Last seen unavailable");
  });

  it("hashes server session identifiers and keeps browser tabs independently addressable", () => {
    expect(sessionHash("secret-session")).not.toContain("secret-session");
    expect(sessionTabKey("secret-session", "tab-1")).not.toBe(
      sessionTabKey("secret-session", "tab-2")
    );
    expect(sessionTabKey("secret-session", "tab-1")).toHaveLength(64);
  });
});
