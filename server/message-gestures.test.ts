import { describe, expect, it } from "vitest";
import { isReplySwipe, messageTapAction } from "../shared/message-gestures";

describe("chat message gestures", () => {
  it("opens reactions on one tap, edits owned messages on triple tap, and deletes on four taps", () => {
    expect(messageTapAction(1, true)).toBe("reaction");
    expect(messageTapAction(3, true)).toBe("edit");
    expect(messageTapAction(3, false)).toBeNull();
    expect(messageTapAction(4, true)).toBe("delete");
    expect(messageTapAction(4, false)).toBe("delete");
  });

  it("recognizes a decisive horizontal swipe but rejects vertical or short movement", () => {
    expect(isReplySwipe(-80, 10)).toBe(true);
    expect(isReplySwipe(60, 55)).toBe(false);
    expect(isReplySwipe(30, 2)).toBe(false);
  });
});
