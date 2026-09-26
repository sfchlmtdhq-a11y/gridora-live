import { describe, expect, it } from "vitest";
import {
  ADMIN_SHORTCUT_TAPS,
  advanceAdminShortcutTap,
} from "../client/src/lib/admin-shortcut";
import { shouldRenderPublicFooter } from "../client/src/lib/public-footer";

describe("Gridora public entry points", () => {
  it("opens the existing admin route on the tenth signed-in logo tap", () => {
    let tapCount = 0;
    expect(ADMIN_SHORTCUT_TAPS).toBe(10);
    for (let tap = 1; tap < ADMIN_SHORTCUT_TAPS; tap += 1) {
      const next = advanceAdminShortcutTap(tapCount);
      expect(next.openAdmin).toBe(false);
      tapCount = next.tapCount;
    }

    const tenth = advanceAdminShortcutTap(tapCount);
    expect(tenth).toEqual({ tapCount: 0, openAdmin: true });
  });

  it("omits the public footer when there are no admin-configured social links", () => {
    expect(shouldRenderPublicFooter(0)).toBe(false);
    expect(shouldRenderPublicFooter(1)).toBe(true);
  });
});
