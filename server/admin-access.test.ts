import { describe, expect, it } from "vitest";
import { isGridoraPrimaryAdmin } from "../shared/admin-access";

describe("Gridora primary admin identity", () => {
  it("recognizes the exact authenticated admin account only", () => {
    expect(
      isGridoraPrimaryAdmin({
        id: 1,
        email: "SFCHLimited@gmail.com",
        role: "admin",
      })
    ).toBe(true);
    expect(
      isGridoraPrimaryAdmin({
        id: 1,
        email: "sfchlimited@gmail.com",
        role: "user",
      })
    ).toBe(false);
    expect(
      isGridoraPrimaryAdmin({
        id: 2,
        email: "sfchlimited@gmail.com",
        role: "admin",
      })
    ).toBe(false);
    expect(isGridoraPrimaryAdmin(null)).toBe(false);
  });
});
