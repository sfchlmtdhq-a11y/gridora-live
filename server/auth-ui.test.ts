import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  getAuthFieldFeedback,
  isAuthPasswordEligible,
  validateAuthForm,
  type AuthFormData,
} from "../client/src/lib/auth-ui";

const baseForm: AuthFormData = {
  name: "Avery Designer",
  username: "avery_designs",
  phone: "+15551234567",
  email: "avery@example.com",
  password: "Creative9",
  confirm: "Creative9",
};

describe("Gridora authentication form helpers", () => {
  it("updates inline feedback immediately as registration fields become valid", () => {
    expect(
      getAuthFieldFeedback("register", "username", {
        ...baseForm,
        username: "av",
      })
    ).toMatchObject({ status: "invalid" });
    expect(
      getAuthFieldFeedback("register", "username", baseForm)
    ).toMatchObject({ status: "valid", message: "Looks good." });
  });

  it("shows immediate password, phone, and confirmation feedback", () => {
    expect(
      getAuthFieldFeedback("register", "password", {
        ...baseForm,
        password: "short",
      })
    ).toMatchObject({ status: "invalid" });
    expect(
      getAuthFieldFeedback("register", "phone", {
        ...baseForm,
        phone: "123",
      })
    ).toMatchObject({ status: "invalid" });
    expect(
      getAuthFieldFeedback("register", "confirm", {
        ...baseForm,
        confirm: "Mismatch9",
      })
    ).toMatchObject({ status: "invalid" });
  });

  it("does not flag blank optional email and surfaces required fields after interaction", () => {
    expect(
      getAuthFieldFeedback("register", "email", { ...baseForm, email: "" })
    ).toBeNull();
    expect(
      getAuthFieldFeedback("register", "name", { ...baseForm, name: "" }, true)
    ).toMatchObject({ status: "invalid" });
  });

  it("accepts a valid login identifier and password", () => {
    expect(validateAuthForm("login", baseForm)).toBeNull();
  });

  it("explains missing login details", () => {
    expect(validateAuthForm("login", { ...baseForm, phone: " " })).toMatch(
      /name, username, phone, or email/i
    );
  });

  it("accepts registration data matching server username and password rules", () => {
    expect(validateAuthForm("register", baseForm)).toBeNull();
  });

  it("rejects usernames that the server would reject", () => {
    expect(
      validateAuthForm("register", { ...baseForm, username: "ab" })
    ).toMatch(/username/i);
    expect(
      validateAuthForm("register", { ...baseForm, username: "has space" })
    ).toMatch(/username/i);
  });

  it("validates phone, optional email, and matching passwords", () => {
    expect(validateAuthForm("register", { ...baseForm, phone: "123" })).toMatch(
      /phone/i
    );
    expect(
      validateAuthForm("register", { ...baseForm, email: "not-an-email" })
    ).toMatch(/email/i);
    expect(validateAuthForm("register", { ...baseForm, email: "" })).toBeNull();
    expect(
      validateAuthForm("register", { ...baseForm, confirm: "Different9" })
    ).toMatch(/passwords do not match/i);
  });

  it("requires a long password containing a number and uppercase letter", () => {
    expect(isAuthPasswordEligible("Creative9")).toBe(true);
    expect(isAuthPasswordEligible("short9A")).toBe(false);
    expect(isAuthPasswordEligible("Creative")).toBe(false);
    expect(isAuthPasswordEligible("creative9")).toBe(false);
  });

  it("maps backend failures to clear, non-technical messages", () => {
    expect(
      getAuthErrorMessage(
        "login",
        "Incorrect name, username, phone, email, or password"
      )
    ).toMatch(/did not match/i);
    expect(
      getAuthErrorMessage(
        "register",
        "Phone number, username, or email is already registered"
      )
    ).toMatch(/already in use/i);
    expect(getAuthErrorMessage("login", "Database is not configured")).toMatch(
      /temporarily unavailable/i
    );
    expect(getAuthErrorMessage("login", "Failed to fetch")).toMatch(
      /internet/i
    );
  });
});
