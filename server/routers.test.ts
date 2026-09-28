import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
      cookie: () => undefined,
    } as TrpcContext["res"],
  };
}

function memberContext(): TrpcContext {
  return {
    ...publicContext(),
    user: {
      id: 17,
      openId: "member-open-id",
      email: "member@example.com",
      name: "Gridora Member",
      username: "gridora_member",
      phone: "07000000000",
      passwordHash: null,
      accountType: "client",
      role: "user",
      moderationStatus: "active",
      moderationReason: null,
      moderatedBy: null,
      moderatedAt: null,
      bio: null,
      skills: null,
      experienceLevel: null,
      avatarUrl: null,
      location: null,
      website: null,
      availability: "Available for projects",
      rating: "0",
      reputation: 0,
      verified: false,
      isFirstUser: false,
      onboardingRating: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

describe("Gridora public procedures", () => {
  it("keeps report and block actions behind authentication", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.moderation.blockUser({ userId: 42 })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.moderation.submitUserReport({
        userId: 42,
        reason: "Review this account",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller.moderation.blockStatus({ userId: 42 })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.admin.reports()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("prevents ordinary members from viewing the admin directory or moderating accounts", async () => {
    const caller = appRouter.createCaller(memberContext());
    await expect(
      caller.admin.userDirectory({ search: "", offset: 0, limit: 25 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.setAccountStatus({ userId: 42, status: "suspended" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.users({ search: "" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.admin.deleteAccount({ userId: 42 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.admin.statusDirectory({ offset: 0, limit: 25 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.editStatus({ statusId: 1, body: "moderated text" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.deleteStatus({ statusId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.deleteAiMemory({ userId: 42 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.admin.deleteAiThread({ userId: 42, threadId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns a signed-out state instead of invoking external OAuth", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.auth.me()).resolves.toBeNull();
    await expect(caller.gridoraAI.threads()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.gridoraAI.saveMemory({ designMemory: "Use warm colors" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.gridoraAI.deleteMemory()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.gridoraAI.deleteThread({ threadId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("uses the multi-identifier login contract", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.auth.login({
        phone: "07000000000",
        password: "Password1",
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps connection actions gated for signed-out visitors", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.connections.status({ userId: 42 })).resolves.toBe(
      "connect"
    );
  });

  it("does not expose Discover results to signed-out visitors", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.discover.list({ search: "" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps incoming request actions gated for signed-out visitors", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.connections.incoming()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.connections.respond({ requestId: 1, action: "accept" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.connections.remove({ userId: 2 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.connections.restore({ userId: 2 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps chat history search and deletion gated for signed-out visitors", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.chats.messages({ chatId: 1, search: "hello" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chats.delete({ messageId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps live notifications and admin content protected", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.notifications.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.admin.content.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects signed-out access to the admin dashboard", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.admin.stats()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects signed-out access to admin device status", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.admin.status()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects signed-out recovery-code issuance", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.admin.issueRecovery()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects signed-out challenge moderation", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.admin.approveChallenge({ id: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps status creation and engagement protected", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.statuses.create({ body: "hello" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.statuses.view({ statusId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.statuses.like({ statusId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps message editing, view-once access, and admin announcements protected", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.chats.edit({ messageId: 1, body: "edited" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chats.viewOnce({ messageId: 1 })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" }
    );
    await expect(
      caller.admin.message({ userId: 1, body: "announcement" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps announcement creation protected", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.admin.announcement({
        title: "Notice",
        body: "Hello",
        allUsers: true,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps project deep links and status analytics protected", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.projects.get({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller.statuses.viewers({ statusId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
