import { describe, expect, it } from "vitest";
import { advanceAdminShortcutTap } from "../client/src/lib/admin-shortcut";
import { shouldRenderPublicFooter } from "../client/src/lib/public-footer";

describe("Gridora public entry points", () => {
  it("opens the existing admin route on the 29th public login logo tap", () => {
    let tapCount = 0;
    for (let tap = 1; tap < 29; tap += 1) {
      const next = advanceAdminShortcutTap(tapCount);
      expect(next.openAdmin).toBe(false);
      tapCount = next.tapCount;
    }

    const twentyNinth = advanceAdminShortcutTap(tapCount);
    expect(twentyNinth).toEqual({ tapCount: 0, openAdmin: true });
  });

  it("omits the public footer when there are no admin-configured social links", () => {
    expect(shouldRenderPublicFooter(0)).toBe(false);
    expect(shouldRenderPublicFooter(1)).toBe(true);
  });
});
