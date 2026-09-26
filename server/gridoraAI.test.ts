import { describe, expect, it } from "vitest";
import {
  buildGridoraAiSystemPrompt,
  gridoraAiImageStorageKey,
  isFirstRegisteredAccount,
  shouldGenerateEditedImage,
} from "./gridoraAI";

describe("Gridora AI boundaries and onboarding", () => {
  it("limits its purpose to graphic design while covering the requested design areas", () => {
    const prompt = buildGridoraAiSystemPrompt({
      name: "Ama",
      accountType: "designer",
    });
    expect(prompt).toContain("sole subject area is graphic design");
    expect(prompt).toContain("color theory");
    expect(prompt).toContain("typography");
    expect(prompt).toContain("image/photo analysis or editing directions");
    expect(prompt).toContain(
      "politely say that you can only help with graphic-design topics"
    );
  });

  it("personalizes the system context to the authenticated account", () => {
    expect(
      buildGridoraAiSystemPrompt({ name: "Ama", accountType: "designer" })
    ).toContain("for Ama, whose account is a designer");
  });

  it("grants the five-star onboarding status to the first account only", () => {
    expect(isFirstRegisteredAccount(0)).toBe(true);
    expect(isFirstRegisteredAccount(1)).toBe(false);
    expect(isFirstRegisteredAccount(2)).toBe(false);
    expect(isFirstRegisteredAccount(-1)).toBe(false);
  });

  it("stores each account image under a unique object key", () => {
    const first = gridoraAiImageStorageKey(42, "image/jpeg");
    const second = gridoraAiImageStorageKey(42, "image/jpeg");
    expect(first).toMatch(/^gridora-ai\/42\/[a-f0-9]{40}\.jpg$/);
    expect(second).not.toBe(first);
    expect(gridoraAiImageStorageKey(42, "image/png")).toMatch(/\.png$/);
    expect(() => gridoraAiImageStorageKey(42, "image/svg+xml")).toThrow(
      "Unsupported Gridora AI image type"
    );
  });

  it("detects actual image edit requests and preserves advice-only prompts", () => {
    expect(shouldGenerateEditedImage("Please crop and brighten this photo")).toBe(
      true
    );
    expect(shouldGenerateEditedImage("Can you edit the background?" )).toBe(true);
    expect(shouldGenerateEditedImage("What do you think of this layout?")).toBe(
      false
    );
  });
});
