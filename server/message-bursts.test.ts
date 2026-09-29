import { describe, expect, it } from "vitest";
import { shouldNotifyMessageBurst } from "../shared/message-bursts";

describe("Gridora message burst notifications", () => {
  it("does not notify for the first two messages", () => {
    expect(shouldNotifyMessageBurst(1, false)).toBe(false);
    expect(shouldNotifyMessageBurst(2, false)).toBe(false);
  });

  it("sends the notification only once when a sender passes two messages", () => {
    expect(shouldNotifyMessageBurst(3, false)).toBe(true);
    expect(shouldNotifyMessageBurst(4, true)).toBe(false);
  });
});
