import { TRPCError } from "@trpc/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  like,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  adminUsers,
  adminSessions,
  availabilitySlots,
  challengeSubmissions,
  challenges,
  chatMembers,
  chats,
  connectionRequests,
  messages,
  notifications,
  gridoraAiMessages,
  gridoraAiProfiles,
  gridoraAiThreads,
  hiddenContacts,
  siteContent,
  portfolioProjects,
  postLikes,
  posts,
  projectRequests,
  reports,
  reviews,
  sessions,
  statuses,
  statusLikes,
  statusViews,
  users,
  userBlocks,
} from "../drizzle/schema";
import { isGridoraPrimaryAdmin } from "../shared/admin-access";
import { getDb, getUnreadNotifications, getUserById } from "./db";
import { eraseGridoraAccountData } from "./adminUserData";
import { storagePut } from "./storage";
import { gridoraAIRouter } from "./gridoraAIRouter";
import { isFirstRegisteredAccount } from "./gridoraAI";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const normalizePhone = (input: string) => {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("234")
    ? digits
    : digits.startsWith("0")
      ? `234${digits.slice(1)}`
      : digits;
};
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(derived, Buffer.from(hash, "hex"));
};
const safeUser = (u: typeof users.$inferSelect) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  phone: u.phone,
  email: u.email,
  accountType: u.accountType,
  role: u.role,
  verified: u.verified,
  isFirstUser: u.isFirstUser,
  onboardingRating: u.onboardingRating,
  bio: u.bio,
  skills: u.skills,
  avatarUrl: u.avatarUrl,
  location: u.location,
  website: u.website,
  availability: u.availability,
  rating: u.rating,
  reputation: u.reputation,
});
const areUsersBlocked = async (
  db: any,
  firstUserId: number,
  secondUserId: number
) => {
  const match = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.userId, firstUserId),
          eq(userBlocks.blockedUserId, secondUserId)
        ),
        and(
          eq(userBlocks.userId, secondUserId),
          eq(userBlocks.blockedUserId, firstUserId)
        )
      )
    )
    .limit(1);
  return match.length > 0;
};
const auth = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(8),
});
const requireUser = (user: typeof users.$inferSelect | null) => {
  if (!user)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to continue",
    });
  if (user.moderationStatus !== "active")
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        user.moderationStatus === "suspended"
          ? "This account is suspended"
          : "This account has been deleted",
    });
  return user;
};
const requireAdmin = (user: typeof users.$inferSelect | null) => {
  const current = requireUser(user);
  if (current.role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  return current;
};
const notify = async (
  userId: number,
  kind: string,
  body: string,
  targetType?: string,
  targetId?: number
) => {
  const db = await getDb();
  if (db)
    await db
      .insert(notifications)
      .values({ userId, kind, body, targetType, targetId });
};
const readCookie = (req: any, name: string) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((v: string) => v.trim())
    .find((v: string) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1);
const requestHost = (req: any) => String(req.headers.host || "localhost:3000");
const requestOrigin = (req: any) =>
  requestHost(req).startsWith("localhost")
    ? `http://${requestHost(req)}`
    : `https://${requestHost(req)}`;
const adminSession = async (ctx: any) => {
  const admin = requireAdmin(ctx.user);
  const db = await getDb();
  if (isGridoraPrimaryAdmin(admin)) {
    if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
    return { db, admin };
  }
  const sid = readCookie(ctx.req, "gridora_admin_session");
  if (!db || !sid)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Complete admin password verification",
    });
  const row = (
    await db
      .select()
      .from(adminSessions)
      .where(and(eq(adminSessions.id, sid), eq(adminSessions.userId, admin.id)))
      .limit(1)
  )[0];
  if (!row || row.expiresAt < new Date())
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin verification expired",
    });
  return { db, admin };
};
const safeAttachment = z
  .object({
    dataUrl: z.string().max(8_000_000),
    name: z.string().min(1).max(255),
    type: z.string().min(1).max(120),
  })
  .optional();

export const appRouter = router({
  system: systemRouter,
  gridoraAI: gridoraAIRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) =>
      ctx.user ? safeUser(ctx.user) : null
    ),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          username: z
            .string()
            .trim()
            .min(3)
            .max(48)
            .regex(/^[a-zA-Z0-9_]+$/),
          phone: z.string().trim().min(7).max(24),
          email: z.string().email().optional().or(z.literal("")),
          password: z.string().min(8).max(128),
          accountType: z.enum(["designer", "client"]),
          bio: z.string().max(500).optional(),
          skills: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Database is not configured",
          });
        const phone = normalizePhone(input.phone);
        const existing = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.phone, phone),
              eq(users.username, input.username),
              input.email
                ? eq(users.email, input.email.trim().toLowerCase())
                : undefined
            )
          )
          .limit(1);
        if (existing.length)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Phone number, username, or email is already registered",
          });
        const openId = `gridora_${createHash("sha256").update(`${phone}:${input.username}`).digest("hex").slice(0, 32)}`;
        const result = await db.insert(users).values({
          openId,
          name: input.name,
          username: input.username,
          phone,
          email: input.email?.trim().toLowerCase() || null,
          passwordHash: hashPassword(input.password),
          accountType: input.accountType,
          bio: input.bio || null,
          skills: input.skills || null,
          lastSignedIn: new Date(),
        });
        const userId = Number(result[0].insertId);
        const firstTwoAccounts = await db
          .select({ id: users.id })
          .from(users)
          .orderBy(asc(users.id))
          .limit(2);
        const registrationRank = firstTwoAccounts.findIndex(
          account => account.id === userId
        );
        const isFirstUser = registrationRank === 0;
        const onboardingRating = isFirstRegisteredAccount(registrationRank);
        const isSpecialFirstUser =
          isFirstUser &&
          (input.email?.trim().toLowerCase() === "sfchlimited@gmail.com" ||
            input.username.toLowerCase() === "sfchlimited");
        await db
          .update(users)
          .set({
            isFirstUser,
            onboardingRating,
            verified: isSpecialFirstUser,
            rating: onboardingRating ? 50 : 0,
          })
          .where(eq(users.id, userId));
        const user = await getUserById(userId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.accountType === "designer") {
          const community = (
            await db
              .select()
              .from(chats)
              .where(eq(chats.isCommunity, true))
              .limit(1)
          )[0];
          const communityId =
            community?.id ??
            Number(
              (
                await db
                  .insert(chats)
                  .values({ title: "Gridora Community", isCommunity: true })
              )[0].insertId
            );
          await db
            .insert(chatMembers)
            .values({ chatId: communityId, userId: user.id });
        }
        const sessionId = randomBytes(48).toString("hex");
        await db.insert(sessions).values({
          id: sessionId,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });
        ctx.res.cookie("gridora_session", sessionId, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 30,
        });
        return safeUser(user);
      }),
    login: publicProcedure.input(auth).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Database is not configured",
        });
      const identifier = input.identifier.trim();
      const user = (
        await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.phone, normalizePhone(identifier)),
              eq(users.username, identifier),
              eq(users.email, identifier),
              eq(users.name, identifier)
            )
          )
          .limit(1)
      )[0];
      if (
        !user?.passwordHash ||
        !verifyPassword(input.password, user.passwordHash)
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect name, username, phone, email, or password",
        });
      if (user.moderationStatus !== "active")
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            user.moderationStatus === "suspended"
              ? "This account is suspended"
              : "This account has been deleted",
        });
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));
      const sessionId = randomBytes(48).toString("hex");
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
      ctx.res.cookie("gridora_session", sessionId, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      return safeUser(user);
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const raw = ctx.req.headers.cookie ?? "";
      const sessionId = raw
        .split(";")
        .map(v => v.trim())
        .find(v => v.startsWith("gridora_session="))
        ?.slice(16);
      const db = await getDb();
      if (db && sessionId)
        await db.delete(sessions).where(eq(sessions.id, sessionId));
      ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1,
      });
      if ("cookie" in ctx.res && typeof ctx.res.cookie === "function")
        ctx.res.cookie("gridora_session", "", {
          ...getSessionCookieOptions(ctx.req),
          maxAge: -1,
        });
      return { success: true };
    }),
  }),
  profile: router({
    update: protectedProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          username: z
            .string()
            .trim()
            .min(3)
            .max(48)
            .regex(/^[a-zA-Z0-9_]+$/),
          bio: z.string().max(500),
          skills: z.string().max(300),
          location: z.string().max(120),
          website: z.string().url().or(z.literal("")),
          availability: z.string().max(120),
          avatarDataUrl: z.string().optional(),
          removeAvatar: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = requireUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        let avatarUrl = input.removeAvatar ? null : user.avatarUrl;
        if (input.avatarDataUrl) {
          if (
            !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(
              input.avatarDataUrl
            )
          )
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Use a PNG, JPG, or WebP image",
            });
          const buffer = Buffer.from(
            input.avatarDataUrl.split(",")[1],
            "base64"
          );
          if (buffer.length > 5 * 1024 * 1024)
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "Profile images must be 5MB or smaller",
            });
          avatarUrl = (
            await storagePut(
              `${user.id}-avatar/${Date.now()}.jpg`,
              buffer,
              "image/jpeg"
            )
          ).url;
        }
        const {
          avatarDataUrl: _avatarDataUrl,
          removeAvatar: _removeAvatar,
          ...profileFields
        } = input;
        await db
          .update(users)
          .set({ ...profileFields, avatarUrl })
          .where(eq(users.id, user.id));
        const updated = await getUserById(user.id);
        return updated ? safeUser(updated) : null;
      }),
    portfolio: router({
      list: publicProcedure
        .input(z.object({ designerId: z.number() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          return db
            .select()
            .from(portfolioProjects)
            .where(eq(portfolioProjects.designerId, input.designerId))
            .orderBy(desc(portfolioProjects.updatedAt));
        }),
      save: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            title: z.string().trim().min(2).max(160),
            description: z.string().max(2000),
            category: z.string().max(80),
            coverUrl: z.string().url().or(z.literal("")).optional(),
            coverDataUrl: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const user = requireUser(ctx.user);
          if (user.accountType !== "designer")
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only designers can edit a portfolio",
            });
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
          let coverUrl = input.coverUrl || "";
          if (input.coverDataUrl) {
            if (
              !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(
                input.coverDataUrl
              )
            )
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Use a PNG, JPG, or WebP image",
              });
            const raw = input.coverDataUrl.split(",")[1];
            const buffer = Buffer.from(raw, "base64");
            if (buffer.length > 8 * 1024 * 1024)
              throw new TRPCError({
                code: "PAYLOAD_TOO_LARGE",
                message: "Portfolio images must be 8MB or smaller",
              });
            coverUrl = (
              await storagePut(
                `${user.id}-portfolio/${Date.now()}.jpg`,
                buffer,
                "image/jpeg"
              )
            ).url;
          }
          if (input.id) {
            const owned = await db
              .select()
              .from(portfolioProjects)
              .where(
                and(
                  eq(portfolioProjects.id, input.id),
                  eq(portfolioProjects.designerId, user.id)
                )
              )
              .limit(1);
            if (!owned.length) throw new TRPCError({ code: "FORBIDDEN" });
            await db
              .update(portfolioProjects)
              .set({
                title: input.title,
                description: input.description,
                category: input.category,
                coverUrl: coverUrl || null,
              })
              .where(eq(portfolioProjects.id, input.id));
            return { id: input.id };
          }
          const result = await db.insert(portfolioProjects).values({
            designerId: user.id,
            title: input.title,
            description: input.description,
            category: input.category,
            coverUrl: coverUrl || null,
          });
          return { id: Number(result[0].insertId), coverUrl };
        }),
      remove: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) return { success: false };
          await db
            .delete(portfolioProjects)
            .where(
              and(
                eq(portfolioProjects.id, input.id),
                eq(portfolioProjects.designerId, requireUser(ctx.user).id)
              )
            );
          return { success: true };
        }),
    }),
    availability: router({
      get: publicProcedure
        .input(z.object({ designerId: z.number() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          return db
            .select()
            .from(availabilitySlots)
            .where(eq(availabilitySlots.designerId, input.designerId))
            .orderBy(asc(availabilitySlots.dayOfWeek));
        }),
      save: protectedProcedure
        .input(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
            enabled: z.boolean(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const user = requireUser(ctx.user);
          if (user.accountType !== "designer")
            throw new TRPCError({ code: "FORBIDDEN" });
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
          await db
            .insert(availabilitySlots)
            .values({ designerId: user.id, ...input })
            .onDuplicateKeyUpdate({ set: input });
          return { success: true };
        }),
    }),
  }),
  moderation: router({
    blockStatus: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        if (user.id === input.userId)
          throw new TRPCError({ code: "BAD_REQUEST" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const [mine, theirs] = await Promise.all([
          db
            .select({ id: userBlocks.id })
            .from(userBlocks)
            .where(
              and(
                eq(userBlocks.userId, user.id),
                eq(userBlocks.blockedUserId, input.userId)
              )
            )
            .limit(1),
          db
            .select({ id: userBlocks.id })
            .from(userBlocks)
            .where(
              and(
                eq(userBlocks.userId, input.userId),
                eq(userBlocks.blockedUserId, user.id)
              )
            )
            .limit(1),
        ]);
        return { blockedByMe: mine.length > 0, blockedMe: theirs.length > 0 };
      }),
    blockUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        if (user.id === input.userId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot block yourself",
          });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const target = (
          await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.id, input.userId),
                eq(users.moderationStatus, "active")
              )
            )
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active user not found",
          });
        await db
          .insert(userBlocks)
          .values({ userId: user.id, blockedUserId: input.userId })
          .onDuplicateKeyUpdate({ set: { userId: user.id } });
        return { success: true };
      }),
    unblockUser: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db
          .delete(userBlocks)
          .where(
            and(
              eq(userBlocks.userId, user.id),
              eq(userBlocks.blockedUserId, input.userId)
            )
          );
        return { success: true };
      }),
    submitUserReport: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          reason: z.string().trim().min(5).max(1500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        if (user.id === input.userId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot report your own account",
          });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const target = (
          await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.id, input.userId),
                eq(users.moderationStatus, "active")
              )
            )
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active user not found",
          });
        await db.insert(reports).values({
          reporterId: user.id,
          targetType: "user",
          targetId: input.userId,
          reason: input.reason,
        });
        return { success: true };
      }),
  }),
  discover: router({
    list: protectedProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            includeHidden: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        const current = requireUser(ctx.user);
        if (!db) return [];
        const term = input?.search?.trim();
        const blockRows = await db
          .select({
            userId: userBlocks.userId,
            blockedUserId: userBlocks.blockedUserId,
          })
          .from(userBlocks)
          .where(
            or(
              eq(userBlocks.userId, current.id),
              eq(userBlocks.blockedUserId, current.id)
            )
          );
        const hiddenUserIds = blockRows.map(row =>
          row.userId === current.id ? row.blockedUserId : row.userId
        );
        const hiddenContactsForUser = await db
          .select({ hiddenUserId: hiddenContacts.hiddenUserId })
          .from(hiddenContacts)
          .where(eq(hiddenContacts.userId, current.id));
        const hiddenContactIds = new Set(
          hiddenContactsForUser.map(row => row.hiddenUserId)
        );
        const relationshipRows = await db
          .select()
          .from(connectionRequests)
          .where(
            or(
              eq(connectionRequests.senderId, current.id),
              eq(connectionRequests.receiverId, current.id)
            )
          );
        const relationshipByUser = new Map<number, string>();
        for (const relation of relationshipRows) {
          const otherId =
            relation.senderId === current.id
              ? relation.receiverId
              : relation.senderId;
          relationshipByUser.set(
            otherId,
            relation.status === "accepted"
              ? "connected"
              : relation.status === "pending"
                ? relation.senderId === current.id
                  ? "request_sent"
                  : "accept"
                : "connect"
          );
        }
        const rows = await db
          .select()
          .from(users)
          .where(
            and(
              ne(users.id, current.id),
              eq(users.moderationStatus, "active"),
              hiddenUserIds.length
                ? notInArray(users.id, hiddenUserIds)
                : undefined,
              !input?.includeHidden && hiddenContactIds.size
                ? notInArray(users.id, Array.from(hiddenContactIds))
                : undefined,
              term
                ? or(
                    like(users.name, `%${term}%`),
                    like(users.username, `%${term}%`),
                    like(users.email, `%${term}%`),
                    like(users.skills, `%${term}%`),
                    like(users.phone, `%${normalizePhone(term)}%`)
                  )
                : undefined
            )
          )
          .orderBy(desc(users.reputation))
          .limit(40);
        return rows.map(person => ({
          ...safeUser(person),
          connectionStatus: relationshipByUser.get(person.id) || "connect",
          isHidden: hiddenContactIds.has(person.id),
        }));
      }),
    profile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        const user = await getUserById(input.id);
        if (!db || !user || user.moderationStatus !== "active") return null;
        if (
          ctx.user &&
          ctx.user.id !== input.id &&
          (await areUsersBlocked(db, ctx.user.id, input.id))
        )
          return null;
        const [portfolio, userReviews, availability] = await Promise.all([
          db
            .select()
            .from(portfolioProjects)
            .where(eq(portfolioProjects.designerId, input.id))
            .orderBy(desc(portfolioProjects.updatedAt)),
          db
            .select()
            .from(reviews)
            .where(eq(reviews.designerId, input.id))
            .orderBy(desc(reviews.createdAt))
            .limit(30),
          db
            .select()
            .from(availabilitySlots)
            .where(eq(availabilitySlots.designerId, input.id))
            .orderBy(asc(availabilitySlots.dayOfWeek)),
        ]);
        const ratingCount = Number(
          (
            await db
              .select({ total: sql<number>`count(*)` })
              .from(reviews)
              .where(eq(reviews.designerId, input.id))
          )[0]?.total || 0
        );
        return {
          ...safeUser(user),
          portfolio,
          reviews: userReviews,
          ratingCount,
          availabilitySlots: availability,
        };
      }),
  }),
  connections: router({
    status: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return "connect";
        const db = await getDb();
        if (!db) return "connect";
        if (await areUsersBlocked(db, ctx.user.id, input.userId))
          return "blocked";
        const item = (
          await db
            .select()
            .from(connectionRequests)
            .where(
              or(
                and(
                  eq(connectionRequests.senderId, ctx.user.id),
                  eq(connectionRequests.receiverId, input.userId)
                ),
                and(
                  eq(connectionRequests.senderId, input.userId),
                  eq(connectionRequests.receiverId, ctx.user.id)
                )
              )
            )
            .limit(1)
        )[0];
        if (!item) return "connect";
        if (item.status === "accepted") return "connected";
        if (item.status === "pending")
          return item.senderId === ctx.user.id ? "request_sent" : "accept";
        return "connect";
      }),
    request: protectedProcedure
      .input(z.object({ receiverId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const user = requireUser(ctx.user);
        const db = await getDb();
        if (!db || user.id === input.receiverId)
          throw new TRPCError({ code: "BAD_REQUEST" });
        if (await areUsersBlocked(db, user.id, input.receiverId))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A blocked connection cannot be requested",
          });
        const removed = await db
          .select({ id: hiddenContacts.id })
          .from(hiddenContacts)
          .where(
            and(
              eq(hiddenContacts.userId, user.id),
              eq(hiddenContacts.hiddenUserId, input.receiverId)
            )
          )
          .limit(1);
        if (removed.length)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Restore this contact before connecting again",
          });
        const existing = (
          await db
            .select()
            .from(connectionRequests)
            .where(
              or(
                and(
                  eq(connectionRequests.senderId, user.id),
                  eq(connectionRequests.receiverId, input.receiverId)
                ),
                and(
                  eq(connectionRequests.senderId, input.receiverId),
                  eq(connectionRequests.receiverId, user.id)
                )
              )
            )
            .limit(1)
        )[0];
        if (existing?.status === "accepted") return "connected";
        if (existing?.status === "pending")
          return existing.senderId === user.id ? "request_sent" : "accept";
        if (existing) {
          await db
            .update(connectionRequests)
            .set({
              senderId: user.id,
              receiverId: input.receiverId,
              status: "pending",
            })
            .where(eq(connectionRequests.id, existing.id));
        } else {
          await db
            .insert(connectionRequests)
            .values({ senderId: user.id, receiverId: input.receiverId });
        }
        await notify(
          input.receiverId,
          "connection",
          `${user.name ?? "Someone"} sent you a connection request`,
          "profile",
          user.id
        );
        return "request_sent";
      }),
    incoming: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const user = requireUser(ctx.user);
      if (!db) return [];
      const blockRows = await db
        .select({
          userId: userBlocks.userId,
          blockedUserId: userBlocks.blockedUserId,
        })
        .from(userBlocks)
        .where(
          or(
            eq(userBlocks.userId, user.id),
            eq(userBlocks.blockedUserId, user.id)
          )
        );
      const hiddenIds = new Set(
        blockRows.map(row =>
          row.userId === user.id ? row.blockedUserId : row.userId
        )
      );
      const removedContacts = await db
        .select({ userId: hiddenContacts.hiddenUserId })
        .from(hiddenContacts)
        .where(eq(hiddenContacts.userId, user.id));
      for (const row of removedContacts) hiddenIds.add(row.userId);
      const incoming = await db
        .select({ request: connectionRequests, sender: users })
        .from(connectionRequests)
        .innerJoin(users, eq(connectionRequests.senderId, users.id))
        .where(
          and(
            eq(connectionRequests.receiverId, user.id),
            eq(connectionRequests.status, "pending")
          )
        )
        .orderBy(desc(connectionRequests.createdAt));
      return incoming
        .filter(({ sender }) => !hiddenIds.has(sender.id))
        .map(({ request, sender }) => ({ request, sender: safeUser(sender) }));
    }),
    respond: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          action: z.enum(["accept", "decline"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const request = (
          await db
            .select()
            .from(connectionRequests)
            .where(
              and(
                eq(connectionRequests.id, input.requestId),
                eq(connectionRequests.receiverId, user.id),
                eq(connectionRequests.status, "pending")
              )
            )
            .limit(1)
        )[0];
        if (!request)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection request is no longer pending",
          });
        if (
          input.action === "accept" &&
          (await areUsersBlocked(db, user.id, request.senderId))
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This connection is blocked",
          });
        if (input.action === "decline") {
          await db
            .update(connectionRequests)
            .set({ status: "declined" })
            .where(eq(connectionRequests.id, request.id));
          await notify(
            request.senderId,
            "connection",
            `${user.name ?? "The user"} declined your connection request`,
            "profile",
            user.id
          );
          return { status: "declined" as const };
        }
        await db
          .update(connectionRequests)
          .set({ status: "accepted" })
          .where(eq(connectionRequests.id, request.id));
        const chat = await db.insert(chats).values({
          title: `${user.name ?? "Connection"} & ${request.senderId}`,
          isCommunity: false,
        });
        const chatId = Number(chat[0].insertId);
        await db.insert(chatMembers).values([
          { chatId, userId: request.senderId },
          { chatId, userId: user.id },
        ]);
        await notify(
          request.senderId,
          "connection",
          `${user.name ?? "Someone"} accepted your connection request`,
          "chat",
          chatId
        );
        return { status: "accepted" as const, chatId };
      }),
    remove: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        if (user.id === input.userId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const target = (
          await db
            .select({ id: users.id })
            .from(users)
            .where(
              and(
                eq(users.id, input.userId),
                eq(users.moderationStatus, "active")
              )
            )
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "Active user not found" });

        await db.transaction(async tx => {
          await tx.delete(connectionRequests).where(
            or(
              and(
                eq(connectionRequests.senderId, user.id),
                eq(connectionRequests.receiverId, input.userId)
              ),
              and(
                eq(connectionRequests.senderId, input.userId),
                eq(connectionRequests.receiverId, user.id)
              )
            )
          );
          const chatsForUser = await tx
            .select({ chatId: chats.id })
            .from(chatMembers)
            .innerJoin(chats, eq(chats.id, chatMembers.chatId))
            .where(
              and(
                eq(chatMembers.userId, user.id),
                eq(chats.isCommunity, false),
                eq(chats.adminOnly, false)
              )
            );
          for (const row of chatsForUser) {
            const otherMember = await tx
              .select({ userId: chatMembers.userId })
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, row.chatId),
                  eq(chatMembers.userId, input.userId)
                )
              )
              .limit(1);
            if (otherMember.length)
              await tx
                .delete(chatMembers)
                .where(
                  and(
                    eq(chatMembers.chatId, row.chatId),
                    inArray(chatMembers.userId, [user.id, input.userId])
                  )
                );
          }
          await tx
            .insert(hiddenContacts)
            .values({ userId: user.id, hiddenUserId: input.userId })
            .onDuplicateKeyUpdate({
              set: { hiddenUserId: input.userId },
            });
        });
        return { success: true };
      }),
    restore: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db
          .delete(hiddenContacts)
          .where(
            and(
              eq(hiddenContacts.userId, user.id),
              eq(hiddenContacts.hiddenUserId, input.userId)
            )
          );
        return { success: true };
      }),
  }),
  chats: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const user = requireUser(ctx.user);
      if (!db) return [];
      const rows = await db
        .select({ chat: chats })
        .from(chatMembers)
        .innerJoin(chats, eq(chatMembers.chatId, chats.id))
        .where(eq(chatMembers.userId, user.id))
        .orderBy(desc(chats.createdAt));
      const visibleChats = await Promise.all(
        rows.map(async ({ chat }) => {
          if (chat.isCommunity) return { ...chat, partner: null };
          if (chat.adminOnly && user.role !== "admin")
            return { ...chat, title: "Gridora Support", partner: null };
          const other = (
            await db
              .select({ user: users })
              .from(chatMembers)
              .innerJoin(users, eq(chatMembers.userId, users.id))
              .where(
                and(
                  eq(chatMembers.chatId, chat.id),
                  ne(chatMembers.userId, user.id)
                )
              )
              .limit(1)
          )[0]?.user;
          if (other && (await areUsersBlocked(db, user.id, other.id)))
            return null;
          return {
            ...chat,
            partner: other
              ? { ...safeUser(other), lastSignedIn: other.lastSignedIn }
              : null,
          };
        })
      );
      return visibleChats.filter(
        (chat): chat is NonNullable<typeof chat> => chat !== null
      );
    }),
    messages: protectedProcedure
      .input(
        z.object({
          chatId: z.number(),
          search: z.string().trim().max(120).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) return [];
        const member = await db
          .select()
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.chatId, input.chatId),
              eq(chatMembers.userId, user.id)
            )
          )
          .limit(1);
        if (!member.length) throw new TRPCError({ code: "FORBIDDEN" });
        const chat = (
          await db
            .select()
            .from(chats)
            .where(eq(chats.id, input.chatId))
            .limit(1)
        )[0];
        if (chat && !chat.isCommunity && !chat.adminOnly) {
          const other = (
            await db
              .select({ userId: chatMembers.userId })
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, input.chatId),
                  ne(chatMembers.userId, user.id)
                )
              )
              .limit(1)
          )[0];
          if (other && (await areUsersBlocked(db, user.id, other.userId)))
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This conversation is unavailable",
            });
        }
        const rows = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.chatId, input.chatId),
              input.search
                ? like(messages.body, `%${input.search}%`)
                : undefined
            )
          )
          .orderBy(asc(messages.createdAt))
          .limit(200);
        return rows.map(row =>
          row.deletedAt
            ? {
                ...row,
                body: "This message has been deleted",
                attachmentUrl: null,
                attachmentName: null,
              }
            : row.viewOnce && row.viewedAt
              ? { ...row, attachmentUrl: null, body: "Opened" }
              : row
        );
      }),
    send: protectedProcedure
      .input(
        z.object({
          chatId: z.number(),
          body: z.string().trim().min(1).max(5000),
          replyToId: z.number().optional(),
          viewOnce: z.boolean().optional(),
          attachment: safeAttachment,
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const member = await db
          .select()
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.chatId, input.chatId),
              eq(chatMembers.userId, user.id)
            )
          )
          .limit(1);
        if (!member.length)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only message accepted connections",
          });
        const chatRow = (
          await db
            .select()
            .from(chats)
            .where(eq(chats.id, input.chatId))
            .limit(1)
        )[0];
        if (chatRow?.adminOnly && user.role !== "admin")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This is an announcement chat",
          });
        if (chatRow && !chatRow.isCommunity && !chatRow.adminOnly) {
          const other = (
            await db
              .select({ userId: chatMembers.userId })
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, input.chatId),
                  ne(chatMembers.userId, user.id)
                )
              )
              .limit(1)
          )[0];
          if (other && (await areUsersBlocked(db, user.id, other.userId)))
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This conversation is unavailable",
            });
        }
        let attachmentUrl: string | undefined;
        if (input.attachment) {
          if (
            !/^data:(image\/(png|jpeg|jpg|gif|webp)|application\/pdf|text\/plain);base64,/.test(
              input.attachment.dataUrl
            )
          )
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Only images, PDF, and text files are allowed",
            });
          const base64 = input.attachment.dataUrl.split(",")[1];
          const buffer = Buffer.from(base64, "base64");
          if (buffer.length > 5 * 1024 * 1024)
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "Files must be 5MB or smaller",
            });
          const uploaded = await storagePut(
            `${user.id}-messages/${input.attachment.name}`,
            buffer,
            input.attachment.type
          );
          attachmentUrl = uploaded.url;
        }
        const result = await db.insert(messages).values({
          chatId: input.chatId,
          senderId: user.id,
          body: input.body,
          replyToId: input.replyToId,
          viewOnce: input.viewOnce || false,
          attachmentUrl,
          attachmentName: input.attachment?.name,
          attachmentType: input.attachment?.type,
        });
        if (!chatRow?.adminOnly) {
          const recipient = (
            await db
              .select({ userId: chatMembers.userId })
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, input.chatId),
                  ne(chatMembers.userId, user.id)
                )
              )
              .limit(1)
          )[0];
          if (recipient)
            await notify(
              recipient.userId,
              "message",
              `${user.name ?? "A connection"} sent you a message`,
              "chat",
              input.chatId
            );
        }
        return {
          id: Number(result[0].insertId),
          body: input.body,
          senderId: user.id,
          chatId: input.chatId,
          replyToId: input.replyToId ?? null,
          attachmentUrl: attachmentUrl ?? null,
          attachmentName: input.attachment?.name ?? null,
          createdAt: new Date(),
        };
      }),
    viewOnce: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const message = (
          await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.id, input.messageId),
                eq(messages.viewOnce, true),
                isNull(messages.viewedAt)
              )
            )
            .limit(1)
        )[0];
        if (!message || message.senderId === user.id || !message.attachmentUrl)
          return { success: false };
        const member = await db
          .select()
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.chatId, message.chatId),
              eq(chatMembers.userId, user.id)
            )
          )
          .limit(1);
        if (!member.length) throw new TRPCError({ code: "FORBIDDEN" });
        const updated = await db
          .update(messages)
          .set({ viewedAt: new Date(), attachmentUrl: null })
          .where(and(eq(messages.id, message.id), isNull(messages.viewedAt)));
        return {
          success: Number((updated as any)?.[0]?.affectedRows ?? 1) > 0,
        };
      }),
    edit: protectedProcedure
      .input(
        z.object({
          messageId: z.number(),
          body: z.string().trim().min(1).max(5000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const message = (
          await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.id, input.messageId),
                eq(messages.senderId, user.id),
                isNull(messages.deletedAt)
              )
            )
            .limit(1)
        )[0];
        if (!message) throw new TRPCError({ code: "FORBIDDEN" });
        await db
          .update(messages)
          .set({ body: input.body, editedAt: new Date() })
          .where(eq(messages.id, input.messageId));
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const message = (
          await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.id, input.messageId),
                eq(messages.senderId, user.id),
                isNull(messages.deletedAt)
              )
            )
            .limit(1)
        )[0];
        if (!message)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own messages",
          });
        await db
          .update(messages)
          .set({ deletedAt: new Date(), body: "This message was deleted" })
          .where(eq(messages.id, input.messageId));
        return { success: true };
      }),
  }),
  posts: router({
    feed: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return (
        await db
          .select({ post: posts, author: users })
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .orderBy(desc(posts.createdAt))
          .limit(40)
      ).map(r => ({ ...r.post, author: safeUser(r.author) }));
    }),
    create: protectedProcedure
      .input(
        z.object({
          body: z.string().trim().min(1).max(2000),
          imageUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const result = await db.insert(posts).values({
          authorId: user.id,
          body: input.body,
          imageUrl: input.imageUrl,
        });
        return {
          id: Number(result[0].insertId),
          body: input.body,
          imageUrl: input.imageUrl ?? null,
          author: safeUser(user),
          createdAt: new Date(),
        };
      }),
    like: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const existing = await db
          .select()
          .from(postLikes)
          .where(
            and(
              eq(postLikes.postId, input.postId),
              eq(postLikes.userId, user.id)
            )
          )
          .limit(1);
        if (existing.length)
          await db.delete(postLikes).where(eq(postLikes.id, existing[0].id));
        else
          await db
            .insert(postLikes)
            .values({ postId: input.postId, userId: user.id });
        return { liked: !existing.length };
      }),
  }),
  reviews: router({
    list: publicProcedure
      .input(z.object({ designerId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(reviews)
          .where(eq(reviews.designerId, input.designerId))
          .orderBy(desc(reviews.createdAt))
          .limit(50);
      }),
    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          designerId: z.number(),
          rating: z.number().int().min(1).max(5),
          body: z.string().trim().min(5).max(1000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const project = (
          await db
            .select()
            .from(projectRequests)
            .where(
              and(
                eq(projectRequests.id, input.projectId),
                eq(projectRequests.clientId, user.id),
                eq(projectRequests.designerId, input.designerId),
                eq(projectRequests.status, "completed")
              )
            )
            .limit(1)
        )[0];
        if (!project)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Reviews are available after a completed project",
          });
        await db.insert(reviews).values({
          projectId: input.projectId,
          designerId: input.designerId,
          rating: input.rating,
          body: input.body,
          reviewerId: user.id,
        });
        const aggregate = await db
          .select({ avg: sql<number>`avg(${reviews.rating})` })
          .from(reviews)
          .where(eq(reviews.designerId, input.designerId));
        await db
          .update(users)
          .set({
            rating: Math.round(Number(aggregate[0]?.avg || input.rating) * 10),
          })
          .where(
            and(
              eq(users.id, input.designerId),
              eq(users.onboardingRating, false)
            )
          );
        await notify(
          input.designerId,
          "review",
          `${user.name ?? "A client"} left you a review`,
          "profile",
          input.designerId
        );
        return { success: true };
      }),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, requireUser(ctx.user).id))
        .orderBy(desc(notifications.createdAt))
        .limit(100);
    }),
    unread: protectedProcedure.query(({ ctx }) =>
      getUnreadNotifications(requireUser(ctx.user).id)
    ),
    markOne: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (db)
          await db
            .update(notifications)
            .set({ readAt: new Date() })
            .where(
              and(
                eq(notifications.id, input.id),
                eq(notifications.userId, requireUser(ctx.user).id)
              )
            );
        return { success: true };
      }),
    markRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (db)
        await db
          .update(notifications)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(notifications.userId, requireUser(ctx.user).id),
              isNull(notifications.readAt)
            )
          );
      return { success: true };
    }),
  }),
  projects: router({
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) return null;
        const request = (
          await db
            .select()
            .from(projectRequests)
            .where(
              and(
                eq(projectRequests.id, input.id),
                or(
                  eq(projectRequests.clientId, user.id),
                  eq(projectRequests.designerId, user.id)
                )
              )
            )
            .limit(1)
        )[0];
        if (!request) throw new TRPCError({ code: "NOT_FOUND" });
        return request;
      }),
    create: protectedProcedure
      .input(
        z.object({
          designerId: z.number(),
          title: z.string().trim().min(3).max(160),
          description: z.string().trim().min(10).max(3000),
          service: z.string().trim().min(2).max(120),
          budget: z.string().max(80).optional(),
          deadline: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const result = await db.insert(projectRequests).values({
          clientId: user.id,
          designerId: input.designerId,
          title: input.title,
          description: input.description,
          service: input.service,
          budget: input.budget,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
        await notify(
          input.designerId,
          "project",
          `${user.name ?? "A client"} sent a project request: ${input.title}`,
          "project",
          Number(result[0].insertId)
        );
        return { id: Number(result[0].insertId), status: "pending" };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const user = requireUser(ctx.user);
      if (!db) return [];
      return db
        .select()
        .from(projectRequests)
        .where(
          or(
            eq(projectRequests.clientId, user.id),
            eq(projectRequests.designerId, user.id)
          )
        )
        .orderBy(desc(projectRequests.createdAt));
    }),
  }),
  reports: router({
    create: protectedProcedure
      .input(
        z.object({
          targetType: z.enum(["user", "post", "message", "challenge"]),
          targetId: z.number(),
          reason: z.string().trim().min(5).max(500),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db.insert(reports).values({ reporterId: user.id, ...input });
        return { success: true };
      }),
  }),
  challenges: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(challenges)
        .where(eq(challenges.status, "approved"))
        .orderBy(desc(challenges.createdAt))
        .limit(20);
    }),
    submit: protectedProcedure
      .input(
        z.object({
          challengeId: z.number(),
          title: z.string().trim().min(3),
          imageUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = requireUser(ctx.user);
        if (user.accountType !== "designer")
          throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db.insert(challengeSubmissions).values({
          challengeId: input.challengeId,
          designerId: user.id,
          title: input.title,
          imageUrl: input.imageUrl,
        });
        return { success: true };
      }),
  }),
  statuses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      const viewer = requireUser(ctx.user);
      if (!db) return [];
      await db.delete(statuses).where(lt(statuses.expiresAt, new Date()));
      const acceptedConnections = await db
        .select({
          senderId: connectionRequests.senderId,
          receiverId: connectionRequests.receiverId,
        })
        .from(connectionRequests)
        .where(eq(connectionRequests.status, "accepted"));
      const allowedUserIds = new Set<number>([viewer.id]);
      for (const connection of acceptedConnections) {
        if (connection.senderId === viewer.id)
          allowedUserIds.add(connection.receiverId);
        if (connection.receiverId === viewer.id)
          allowedUserIds.add(connection.senderId);
      }
      const blockedRows = await db
        .select({
          userId: userBlocks.userId,
          blockedUserId: userBlocks.blockedUserId,
        })
        .from(userBlocks)
        .where(
          or(
            eq(userBlocks.userId, viewer.id),
            eq(userBlocks.blockedUserId, viewer.id)
          )
        );
      for (const relation of blockedRows) {
        allowedUserIds.delete(
          relation.userId === viewer.id
            ? relation.blockedUserId
            : relation.userId
        );
      }
      const rows = await db
        .select({ status: statuses, author: users })
        .from(statuses)
        .innerJoin(users, eq(statuses.userId, users.id))
        .where(gt(statuses.expiresAt, new Date()))
        .orderBy(desc(statuses.createdAt))
        .limit(100);
      return rows
        .filter(({ status }) => allowedUserIds.has(status.userId))
        .map(({ status, author }) => ({
          ...status,
          author: safeUser(author),
          canSeeStats: status.userId === viewer.id,
          viewCount: status.userId === viewer.id ? status.viewCount : undefined,
          likeCount: status.userId === viewer.id ? status.likeCount : undefined,
        }));
    }),
    create: protectedProcedure
      .input(
        z.object({
          body: z.string().max(1000).optional(),
          imageDataUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        if (!input.body?.trim() && !input.imageDataUrl)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Add text or an image to your status",
          });
        let imageUrl: string | undefined;
        if (input.imageDataUrl) {
          if (
            !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(input.imageDataUrl)
          )
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Use a PNG, JPG, or WebP image",
            });
          const buffer = Buffer.from(
            input.imageDataUrl.split(",")[1],
            "base64"
          );
          if (buffer.length > 8 * 1024 * 1024)
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "Status images must be 8MB or smaller",
            });
          imageUrl = (
            await storagePut(
              `${user.id}-statuses/${Date.now()}.jpg`,
              buffer,
              "image/jpeg"
            )
          ).url;
        }
        const result = await db.insert(statuses).values({
          userId: user.id,
          body: input.body?.trim() || "",
          imageUrl,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        return { id: Number(result[0].insertId) };
      }),
    view: protectedProcedure
      .input(z.object({ statusId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const viewer = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const status = (
          await db
            .select()
            .from(statuses)
            .where(
              and(
                eq(statuses.id, input.statusId),
                gt(statuses.expiresAt, new Date())
              )
            )
            .limit(1)
        )[0];
        if (!status)
          throw new TRPCError({ code: "NOT_FOUND", message: "Status expired" });
        if (status.userId !== viewer.id) {
          if (await areUsersBlocked(db, viewer.id, status.userId))
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This status is unavailable",
            });
          const connection = await db
            .select({ id: connectionRequests.id })
            .from(connectionRequests)
            .where(
              and(
                eq(connectionRequests.status, "accepted"),
                or(
                  and(
                    eq(connectionRequests.senderId, viewer.id),
                    eq(connectionRequests.receiverId, status.userId)
                  ),
                  and(
                    eq(connectionRequests.senderId, status.userId),
                    eq(connectionRequests.receiverId, viewer.id)
                  )
                )
              )
            )
            .limit(1);
          if (!connection.length)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Connect to this person to view their status",
            });
          const prior = await db
            .select()
            .from(statusViews)
            .where(
              and(
                eq(statusViews.statusId, status.id),
                eq(statusViews.viewerId, viewer.id)
              )
            )
            .limit(1);
          if (!prior.length) {
            await db
              .insert(statusViews)
              .values({ statusId: status.id, viewerId: viewer.id });
            await db
              .update(statuses)
              .set({ viewCount: status.viewCount + 1 })
              .where(eq(statuses.id, status.id));
          }
        }
        return {
          id: status.id,
          imageUrl: status.imageUrl,
          body: status.body,
          ownerId: status.userId,
          canSeeStats: status.userId === viewer.id,
          viewCount: status.userId === viewer.id ? status.viewCount : undefined,
          likeCount: status.userId === viewer.id ? status.likeCount : undefined,
        };
      }),
    viewers: protectedProcedure
      .input(z.object({ statusId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const owner = requireUser(ctx.user);
        if (!db) return { viewers: [], likes: [] };
        const status = (
          await db
            .select()
            .from(statuses)
            .where(
              and(
                eq(statuses.id, input.statusId),
                eq(statuses.userId, owner.id),
                gt(statuses.expiresAt, new Date())
              )
            )
            .limit(1)
        )[0];
        if (!status)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the status owner can see analytics",
          });
        const [views, likes] = await Promise.all([
          db
            .select({ user: users, viewedAt: statusViews.viewedAt })
            .from(statusViews)
            .innerJoin(users, eq(statusViews.viewerId, users.id))
            .where(eq(statusViews.statusId, status.id))
            .orderBy(desc(statusViews.viewedAt)),
          db
            .select({ user: users, createdAt: statusLikes.createdAt })
            .from(statusLikes)
            .innerJoin(users, eq(statusLikes.userId, users.id))
            .where(eq(statusLikes.statusId, status.id))
            .orderBy(desc(statusLikes.createdAt)),
        ]);
        const identity = (person: typeof users.$inferSelect) => ({
          id: person.id,
          name: person.name,
          username: person.username,
          avatarUrl: person.avatarUrl,
        });
        return {
          viewers: views.map(({ user, viewedAt }) => ({
            ...identity(user),
            viewedAt,
          })),
          likes: likes.map(({ user, createdAt }) => ({
            ...identity(user),
            createdAt,
          })),
        };
      }),
    like: protectedProcedure
      .input(z.object({ statusId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const user = requireUser(ctx.user);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const status = (
          await db
            .select()
            .from(statuses)
            .where(
              and(
                eq(statuses.id, input.statusId),
                gt(statuses.expiresAt, new Date())
              )
            )
            .limit(1)
        )[0];
        if (!status) throw new TRPCError({ code: "NOT_FOUND" });
        if (status.userId !== user.id) {
          if (await areUsersBlocked(db, user.id, status.userId))
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This status is unavailable",
            });
          const connection = await db
            .select({ id: connectionRequests.id })
            .from(connectionRequests)
            .where(
              and(
                eq(connectionRequests.status, "accepted"),
                or(
                  and(
                    eq(connectionRequests.senderId, user.id),
                    eq(connectionRequests.receiverId, status.userId)
                  ),
                  and(
                    eq(connectionRequests.senderId, status.userId),
                    eq(connectionRequests.receiverId, user.id)
                  )
                )
              )
            )
            .limit(1);
          if (!connection.length) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const existing = await db
          .select()
          .from(statusLikes)
          .where(
            and(
              eq(statusLikes.statusId, input.statusId),
              eq(statusLikes.userId, user.id)
            )
          )
          .limit(1);
        if (existing.length) {
          await db
            .delete(statusLikes)
            .where(eq(statusLikes.id, existing[0].id));
          await db
            .update(statuses)
            .set({ likeCount: Math.max(0, status.likeCount - 1) })
            .where(eq(statuses.id, status.id));
          return { liked: false };
        }
        await db
          .insert(statusLikes)
          .values({ statusId: input.statusId, userId: user.id });
        await db
          .update(statuses)
          .set({ likeCount: status.likeCount + 1 })
          .where(eq(statuses.id, status.id));
        return { liked: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (db)
          await db
            .delete(statuses)
            .where(
              and(
                eq(statuses.id, input.id),
                eq(statuses.userId, requireUser(ctx.user).id)
              )
            );
        return { success: true };
      }),
  }),
  content: router({
    publicSettings: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return {};
      const keys = [
        "home.tagline",
        "home.kicker",
        "home.titleStart",
        "home.titleAccent",
        "home.titleEnd",
        "footer.credit",
        "social.instagram",
        "social.facebook",
        "social.linkedin",
        "social.tiktok",
        "social.youtube",
      ];
      const rows = await db
        .select({ key: siteContent.key, value: siteContent.value })
        .from(siteContent)
        .where(inArray(siteContent.key, keys));
      return Object.fromEntries(rows.map(row => [row.key, row.value]));
    }),
    get: publicProcedure
      .input(z.object({ key: z.string().max(80) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        return (
          (
            await db
              .select()
              .from(siteContent)
              .where(eq(siteContent.key, input.key))
              .limit(1)
          )[0] || null
        );
      }),
  }),
  admin: router({
    unlock: protectedProcedure
      .input(z.object({ password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx.user);
        const expected = process.env.GRIDORA_ADMIN_PASSWORD || "sunday0815";
        if (
          input.password !== expected &&
          (!admin.passwordHash ||
            !verifyPassword(input.password, admin.passwordHash))
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin password is incorrect",
          });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const sid = randomBytes(48).toString("hex");
        await db.insert(adminSessions).values({
          id: sid,
          userId: admin.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        });
        ctx.res.cookie("gridora_admin_session", sid, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 30,
        });
        return { unlocked: true };
      }),
    status: protectedProcedure.query(async ({ ctx }) => {
      const admin = requireAdmin(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
      const row = (
        await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.userId, admin.id))
          .limit(1)
      )[0];
      const sid = readCookie(ctx.req, "gridora_admin_session");
      const session = sid
        ? (
            await db
              .select()
              .from(adminSessions)
              .where(
                and(
                  eq(adminSessions.id, sid),
                  eq(adminSessions.userId, admin.id)
                )
              )
              .limit(1)
          )[0]
        : undefined;
      return {
        hasCredential: Boolean(row?.credentialId && row.publicKey),
        unlocked:
          isGridoraPrimaryAdmin(admin) ||
          Boolean(session && session.expiresAt > new Date()),
        hasRecovery: Boolean(row?.recoveryHash),
      };
    }),
    beginEnrollment: protectedProcedure.mutation(async ({ ctx }) => {
      const admin = requireAdmin(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
      const primary = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.isPrimary, true))
        .limit(1);
      const existing = (
        await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.userId, admin.id))
          .limit(1)
      )[0];
      if (existing?.credentialId)
        throw new TRPCError({
          code: "CONFLICT",
          message: "A secure device is already enrolled",
        });
      const options = await generateRegistrationOptions({
        rpName: "Gridora Admin",
        rpID: requestHost(ctx.req).split(":")[0],
        userName: admin.username || admin.phone || `admin-${admin.id}`,
        userDisplayName: admin.name || "Gridora administrator",
        userID: new TextEncoder().encode(String(admin.id)),
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
        },
      });
      if (existing)
        await db
          .update(adminUsers)
          .set({ challenge: options.challenge })
          .where(eq(adminUsers.id, existing.id));
      else
        await db.insert(adminUsers).values({
          userId: admin.id,
          challenge: options.challenge,
          isPrimary: primary.length === 0,
        });
      return options;
    }),
    finishEnrollment: protectedProcedure
      .input(z.object({ response: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const row = (
          await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.userId, admin.id))
            .limit(1)
        )[0];
        if (!row?.challenge)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Start device enrollment again",
          });
        const result = await verifyRegistrationResponse({
          response: input.response,
          expectedChallenge: row.challenge,
          expectedOrigin: requestOrigin(ctx.req),
          expectedRPID: requestHost(ctx.req).split(":")[0],
        });
        if (!result.verified || !result.registrationInfo)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Device verification failed",
          });
        const info: any = result.registrationInfo;
        const credential = info.credential;
        await db
          .update(adminUsers)
          .set({
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString("base64url"),
            counter: credential.counter,
            transports: JSON.stringify(credential.transports || []),
            challenge: null,
          })
          .where(eq(adminUsers.id, row.id));
        return { verified: true };
      }),
    beginAuthentication: protectedProcedure.mutation(async ({ ctx }) => {
      const admin = requireAdmin(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
      const row = (
        await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.userId, admin.id))
          .limit(1)
      )[0];
      if (!row?.credentialId)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Enroll this device first",
        });
      const options = await generateAuthenticationOptions({
        rpID: requestHost(ctx.req).split(":")[0],
        userVerification: "required",
        allowCredentials: [
          {
            id: row.credentialId,
            transports: row.transports ? JSON.parse(row.transports) : undefined,
          },
        ],
      });
      await db
        .update(adminUsers)
        .set({ challenge: options.challenge })
        .where(eq(adminUsers.id, row.id));
      return options;
    }),
    finishAuthentication: protectedProcedure
      .input(z.object({ password: z.string().min(8), response: z.any() }))
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx.user);
        if (
          !admin.passwordHash ||
          !verifyPassword(input.password, admin.passwordHash)
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin password is incorrect",
          });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const row = (
          await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.userId, admin.id))
            .limit(1)
        )[0];
        if (!row?.challenge || !row.publicKey || !row.credentialId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enroll this device first",
          });
        const result = await verifyAuthenticationResponse({
          response: input.response,
          expectedChallenge: row.challenge,
          expectedOrigin: requestOrigin(ctx.req),
          expectedRPID: requestHost(ctx.req).split(":")[0],
          credential: {
            id: row.credentialId,
            publicKey: Buffer.from(row.publicKey, "base64url"),
            counter: row.counter,
            transports: row.transports ? JSON.parse(row.transports) : undefined,
          },
        });
        if (!result.verified)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Biometric verification failed",
          });
        await db
          .update(adminUsers)
          .set({
            counter: result.authenticationInfo.newCounter,
            challenge: null,
          })
          .where(eq(adminUsers.id, row.id));
        const sid = randomBytes(48).toString("hex");
        await db.insert(adminSessions).values({
          id: sid,
          userId: admin.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        });
        ctx.res.cookie("gridora_admin_session", sid, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 30,
        });
        return { verified: true };
      }),
    grantAdmin: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        const target = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, input.userId));
        await notify(
          input.userId,
          "admin",
          "You have been granted Gridora administrator access. Enroll your own secure device to continue."
        );
        return { success: true };
      }),
    issueRecovery: protectedProcedure.mutation(async ({ ctx }) => {
      const { db, admin } = await adminSession(ctx);
      const row = (
        await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.userId, admin.id))
          .limit(1)
      )[0];
      if (!row)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Enroll the primary admin device first",
        });
      if (!row.isPrimary) {
        const all = await db.select().from(adminUsers);
        if (all.length > 1)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the primary admin can issue recovery codes",
          });
        await db
          .update(adminUsers)
          .set({ isPrimary: true })
          .where(eq(adminUsers.id, row.id));
      }
      const code = randomBytes(10).toString("hex").toUpperCase();
      await db
        .update(adminUsers)
        .set({ recoveryHash: createHash("sha256").update(code).digest("hex") })
        .where(eq(adminUsers.id, row.id));
      return { code };
    }),
    recover: protectedProcedure
      .input(
        z.object({
          password: z.string().min(8),
          recoveryCode: z.string().min(12).max(32),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx.user);
        if (
          !admin.passwordHash ||
          !verifyPassword(input.password, admin.passwordHash)
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin password is incorrect",
          });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const row = (
          await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.userId, admin.id))
            .limit(1)
        )[0];
        const hash = createHash("sha256")
          .update(input.recoveryCode.trim().toUpperCase())
          .digest("hex");
        if (
          !row?.recoveryHash ||
          row.recoveryHash.length !== hash.length ||
          !timingSafeEqual(Buffer.from(hash), Buffer.from(row.recoveryHash))
        )
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Recovery code is invalid or already used",
          });
        await db
          .update(adminUsers)
          .set({
            credentialId: null,
            publicKey: null,
            counter: 0,
            transports: null,
            challenge: null,
            recoveryHash: null,
          })
          .where(eq(adminUsers.id, row.id));
        await db
          .delete(adminSessions)
          .where(eq(adminSessions.userId, admin.id));
        const sid = randomBytes(48).toString("hex");
        await db.insert(adminSessions).values({
          id: sid,
          userId: admin.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        });
        ctx.res.cookie("gridora_admin_session", sid, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 30,
        });
        return { recovered: true };
      }),
    listAdmins: protectedProcedure.query(async ({ ctx }) => {
      const { db } = await adminSession(ctx);
      return db
        .select({ admin: adminUsers, user: users })
        .from(adminUsers)
        .innerJoin(users, eq(adminUsers.userId, users.id));
    }),
    revokeDevice: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        if (input.userId === admin.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Use the recovery code to replace your own lost device",
          });
        const target = (
          await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.userId, input.userId))
            .limit(1)
        )[0];
        if (!target) throw new TRPCError({ code: "NOT_FOUND" });
        await db
          .update(adminUsers)
          .set({
            credentialId: null,
            publicKey: null,
            counter: 0,
            transports: null,
            challenge: null,
          })
          .where(eq(adminUsers.id, target.id));
        await db
          .delete(adminSessions)
          .where(eq(adminSessions.userId, input.userId));
        return { success: true };
      }),
    revokeAdmin: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        if (input.userId === admin.id)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot revoke your own primary access",
          });
        const target = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        )[0];
        if (target && isGridoraPrimaryAdmin(target))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The primary administrator role cannot be revoked",
          });
        await db
          .update(users)
          .set({ role: "user" })
          .where(eq(users.id, input.userId));
        await db.delete(adminUsers).where(eq(adminUsers.userId, input.userId));
        await db
          .delete(adminSessions)
          .where(eq(adminSessions.userId, input.userId));
        return { success: true };
      }),
    content: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { db } = await adminSession(ctx);
        return db.select().from(siteContent);
      }),
      save: protectedProcedure
        .input(
          z.object({
            key: z
              .string()
              .regex(/^[a-z0-9_.-]+$/)
              .max(80),
            value: z.string().max(10000).optional(),
            imageDataUrl: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { db, admin } = await adminSession(ctx);
          let value = input.value || "";
          if (input.key.startsWith("social.") && value) {
            let link: URL;
            try {
              link = new URL(value);
            } catch {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Social profile links must be valid HTTPS URLs",
              });
            }
            if (link.protocol !== "https:" || !link.hostname)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Social profile links must use HTTPS",
              });
            value = link.toString();
          }
          if (input.imageDataUrl) {
            if (
              !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(
                input.imageDataUrl
              )
            )
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Use a PNG, JPG, or WebP image",
              });
            const buffer = Buffer.from(
              input.imageDataUrl.split(",")[1],
              "base64"
            );
            if (buffer.length > 5 * 1024 * 1024)
              throw new TRPCError({
                code: "PAYLOAD_TOO_LARGE",
                message: "Branding images must be 5MB or smaller",
              });
            value = (
              await storagePut(
                `branding/${input.key}-${Date.now()}.jpg`,
                buffer,
                "image/jpeg"
              )
            ).url;
          }
          await db
            .insert(siteContent)
            .values({ key: input.key, value, updatedBy: admin.id })
            .onDuplicateKeyUpdate({
              set: { value, updatedBy: admin.id, updatedAt: new Date() },
            });
          return { success: true, value };
        }),
      remove: protectedProcedure
        .input(
          z.object({
            key: z
              .string()
              .regex(/^[a-z0-9_.-]+$/)
              .max(80),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { db, admin } = await adminSession(ctx);
          await db
            .insert(siteContent)
            .values({ key: input.key, value: "", updatedBy: admin.id })
            .onDuplicateKeyUpdate({
              set: { value: "", updatedBy: admin.id, updatedAt: new Date() },
            });
          return { success: true };
        }),
    }),
    announcement: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(120),
          body: z.string().trim().min(1).max(2000),
          imageDataUrl: z.string().optional(),
          allUsers: z.boolean(),
          userIds: z.array(z.number().int().positive()).max(1000).optional(),
          targetType: z.string().max(48).optional(),
          targetId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        let imageUrl: string | undefined;
        if (input.imageDataUrl) {
          if (
            !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(input.imageDataUrl)
          )
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Use a PNG, JPG, or WebP image",
            });
          const bytes = Buffer.from(input.imageDataUrl.split(",")[1], "base64");
          if (bytes.length > 5 * 1024 * 1024)
            throw new TRPCError({
              code: "PAYLOAD_TOO_LARGE",
              message: "Announcement images must be 5MB or smaller",
            });
          imageUrl = (
            await storagePut(
              `branding/announcement-${Date.now()}.jpg`,
              bytes,
              "image/jpeg"
            )
          ).url;
        }
        const targets = input.allUsers
          ? await db.select({ id: users.id }).from(users)
          : await db
              .select({ id: users.id })
              .from(users)
              .where(
                input.userIds?.length
                  ? or(...input.userIds.map(id => eq(users.id, id)))
                  : eq(users.id, -1)
              );
        if (!targets.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select at least one recipient",
          });
        await db.insert(notifications).values(
          targets.map(({ id }) => ({
            userId: id,
            kind: "announcement",
            body: `${input.title}\n${input.body}`,
            imageUrl: imageUrl ?? null,
            targetType: input.targetType,
            targetId: input.targetId,
          }))
        );
        return { count: targets.length };
      }),
    message: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          body: z.string().trim().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        const target = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        const candidates = await db
          .select({ chat: chats })
          .from(chatMembers)
          .innerJoin(chats, eq(chats.id, chatMembers.chatId))
          .where(
            and(eq(chats.adminOnly, true), eq(chatMembers.userId, admin.id))
          );
        let chat = undefined as any;
        for (const candidate of candidates) {
          const member = await db
            .select()
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.chatId, candidate.chat.id),
                eq(chatMembers.userId, target.id)
              )
            )
            .limit(1);
          if (member.length) {
            chat = candidate.chat;
            break;
          }
        }
        if (!chat) {
          const result = await db.insert(chats).values({
            title: `Admin · ${target.name || target.username}`,
            adminOnly: true,
          });
          const chatId = Number(result[0].insertId);
          await db.insert(chatMembers).values([
            { chatId, userId: admin.id },
            { chatId, userId: target.id },
          ]);
          chat = (
            await db.select().from(chats).where(eq(chats.id, chatId)).limit(1)
          )[0];
        } else {
          const member = await db
            .select()
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.chatId, chat.id),
                eq(chatMembers.userId, target.id)
              )
            )
            .limit(1);
          if (!member.length)
            await db
              .insert(chatMembers)
              .values({ chatId: chat.id, userId: target.id });
        }
        await db
          .insert(messages)
          .values({ chatId: chat.id, senderId: admin.id, body: input.body });
        await notify(
          target.id,
          "admin_message",
          "You received a message from Gridora administration",
          "chat",
          chat.id
        );
        return { chatId: chat.id };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const { db } = await adminSession(ctx);
      const [u, p, r, c] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(posts),
        db
          .select({ count: sql<number>`count(*)` })
          .from(reports)
          .where(eq(reports.status, "open")),
        db
          .select({ count: sql<number>`count(*)` })
          .from(challenges)
          .where(eq(challenges.status, "pending")),
      ]);
      return {
        users: Number(u[0]?.count || 0),
        posts: Number(p[0]?.count || 0),
        reports: Number(r[0]?.count || 0),
        challenges: Number(c[0]?.count || 0),
      };
    }),
    users: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        if (!db) return [];
        const term = input?.search?.trim();
        return db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            phone: users.phone,
            accountType: users.accountType,
            role: users.role,
            moderationStatus: users.moderationStatus,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(
            and(
              eq(users.moderationStatus, "active"),
              term
                ? or(
                    like(users.name, `%${term}%`),
                    like(users.username, `%${term}%`),
                    like(users.phone, `%${term}%`)
                  )
                : undefined
            )
          )
          .orderBy(desc(users.createdAt))
          .limit(100);
      }),
    userDirectory: protectedProcedure
      .input(
        z.object({
          search: z.string().trim().max(120).optional(),
          offset: z.number().int().min(0).max(1_000_000),
          limit: z.number().int().min(1).max(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        const term = input.search?.trim();
        const where = term
          ? or(
              like(users.name, `%${term}%`),
              like(users.username, `%${term}%`),
              like(users.phone, `%${term}%`),
              like(users.email, `%${term}%`)
            )
          : undefined;
        const [rows, total] = await Promise.all([
          db
            .select({
              id: users.id,
              name: users.name,
              username: users.username,
              phone: users.phone,
              email: users.email,
              accountType: users.accountType,
              role: users.role,
              moderationStatus: users.moderationStatus,
              moderationReason: users.moderationReason,
              createdAt: users.createdAt,
              lastSignedIn: users.lastSignedIn,
            })
            .from(users)
            .where(where)
            .orderBy(desc(users.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(where),
        ]);
        return {
          rows,
          total: Number(total[0]?.count || 0),
          offset: input.offset,
          limit: input.limit,
        };
      }),
    setAccountStatus: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          status: z.enum(["active", "suspended", "deleted"]),
          reason: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        if (input.userId === admin.id)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "You cannot suspend or delete your own administrator account",
          });
        const target = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (isGridoraPrimaryAdmin(target))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The primary administrator account cannot be suspended or deleted",
          });
        await db
          .update(users)
          .set({
            moderationStatus: input.status,
            moderationReason:
              input.status === "active" ? null : input.reason?.trim() || null,
            moderatedBy: input.status === "active" ? null : admin.id,
            moderatedAt: input.status === "active" ? null : new Date(),
          })
          .where(eq(users.id, input.userId));
        if (input.status !== "active") {
          await Promise.all([
            db.delete(sessions).where(eq(sessions.userId, input.userId)),
            db
              .delete(adminSessions)
              .where(eq(adminSessions.userId, input.userId)),
          ]);
        }
        return { success: true, status: input.status };
      }),
    deleteAccount: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        const target = (
          await db
            .select()
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
        )[0];
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (target.id === admin.id || isGridoraPrimaryAdmin(target))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "The active or primary administrator account cannot be erased",
          });
        if (target.role === "admin")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Revoke this delegated administrator role before erasing the account",
          });
        await db.transaction(async tx =>
          eraseGridoraAccountData(tx, target.id, admin.id)
        );
        return { success: true };
      }),
    statusDirectory: protectedProcedure
      .input(
        z.object({
          offset: z.number().int().min(0).max(1_000_000),
          limit: z.number().int().min(1).max(50),
        })
      )
      .query(async ({ ctx, input }) => {
      const { db } = await adminSession(ctx);
      const [rows, total] = await Promise.all([
        db
          .select({
            status: statuses,
            author: {
              id: users.id,
              name: users.name,
              username: users.username,
            },
          })
          .from(statuses)
          .innerJoin(users, eq(statuses.userId, users.id))
          .orderBy(desc(statuses.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(statuses),
      ]);
      return {
        rows,
        total: Number(total[0]?.count || 0),
        offset: input.offset,
        limit: input.limit,
      };
    }),
    editStatus: protectedProcedure
      .input(
        z.object({
          statusId: z.number().int().positive(),
          body: z.string().trim().max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        const status = (
          await db
            .select({ id: statuses.id })
            .from(statuses)
            .where(eq(statuses.id, input.statusId))
            .limit(1)
        )[0];
        if (!status)
          throw new TRPCError({ code: "NOT_FOUND", message: "Status not found" });
        await db
          .update(statuses)
          .set({ body: input.body })
          .where(eq(statuses.id, input.statusId));
        return { success: true };
      }),
    deleteStatus: protectedProcedure
      .input(z.object({ statusId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        await db.transaction(async tx => {
          const status = (
            await tx
              .select({ id: statuses.id })
              .from(statuses)
              .where(eq(statuses.id, input.statusId))
              .limit(1)
          )[0];
          if (!status)
            throw new TRPCError({ code: "NOT_FOUND", message: "Status not found" });
          await tx
            .delete(statusLikes)
            .where(eq(statusLikes.statusId, input.statusId));
          await tx
            .delete(statusViews)
            .where(eq(statusViews.statusId, input.statusId));
          await tx.delete(statuses).where(eq(statuses.id, input.statusId));
        });
        return { success: true };
      }),
    aiMemoryStatus: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        const memory = (
          await db
            .select({ designMemory: gridoraAiProfiles.designMemory })
            .from(gridoraAiProfiles)
            .where(eq(gridoraAiProfiles.userId, input.userId))
            .limit(1)
        )[0];
        return { hasNotes: Boolean(memory?.designMemory?.trim()) };
      }),
    aiThreads: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        return db
          .select({
            id: gridoraAiThreads.id,
            updatedAt: gridoraAiThreads.updatedAt,
          })
          .from(gridoraAiThreads)
          .where(eq(gridoraAiThreads.userId, input.userId))
          .orderBy(desc(gridoraAiThreads.updatedAt))
          .limit(50);
      }),
    deleteAiMemory: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        await db
          .delete(gridoraAiProfiles)
          .where(eq(gridoraAiProfiles.userId, input.userId));
        return { success: true };
      }),
    deleteAiThread: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          threadId: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        const thread = (
          await db
            .select({ id: gridoraAiThreads.id })
            .from(gridoraAiThreads)
            .where(
              and(
                eq(gridoraAiThreads.id, input.threadId),
                eq(gridoraAiThreads.userId, input.userId)
              )
            )
            .limit(1)
        )[0];
        if (!thread)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Gridora AI conversation not found",
          });
        await db.transaction(async tx => {
          await tx
            .delete(gridoraAiMessages)
            .where(eq(gridoraAiMessages.threadId, thread.id));
          await tx
            .delete(gridoraAiThreads)
            .where(
              and(
                eq(gridoraAiThreads.id, thread.id),
                eq(gridoraAiThreads.userId, input.userId)
              )
            );
        });
        return { success: true };
      }),
    reports: protectedProcedure.query(async ({ ctx }) => {
      const { db } = await adminSession(ctx);
      if (!db) return [];
      const rows = await db
        .select()
        .from(reports)
        .orderBy(desc(reports.createdAt))
        .limit(100);
      return Promise.all(
        rows.map(async report => ({
          ...report,
          reporter: safeUser((await getUserById(report.reporterId)) as any),
          targetUser:
            report.targetType === "user"
              ? safeUser((await getUserById(report.targetId)) as any)
              : null,
          reporterBlockedTarget:
            report.targetType === "user"
              ? await db
                  .select({ id: userBlocks.id })
                  .from(userBlocks)
                  .where(
                    and(
                      eq(userBlocks.userId, report.reporterId),
                      eq(userBlocks.blockedUserId, report.targetId)
                    )
                  )
                  .then(rows => rows.length > 0)
              : false,
        }))
      );
    }),
    resolveReport: protectedProcedure
      .input(
        z.object({ id: z.number(), status: z.enum(["reviewed", "resolved"]) })
      )
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db
          .update(reports)
          .set({ status: input.status, resolvedBy: admin.id })
          .where(eq(reports.id, input.id));
        return { success: true };
      }),
    challenges: protectedProcedure.query(async ({ ctx }) => {
      const { db } = await adminSession(ctx);
      return db
        .select()
        .from(challenges)
        .orderBy(asc(challenges.status), desc(challenges.createdAt))
        .limit(100);
    }),
    approveChallenge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        await db
          .update(challenges)
          .set({ status: "approved" })
          .where(eq(challenges.id, input.id));
        return { success: true };
      }),
    denyChallenge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        await db
          .update(challenges)
          .set({ status: "denied" })
          .where(eq(challenges.id, input.id));
        return { success: true };
      }),
    createChallenge: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(3).max(160),
          description: z.string().trim().min(10).max(2000),
          deadline: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { db, admin } = await adminSession(ctx);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        const result = await db.insert(challenges).values({
          ...input,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
          createdBy: admin.id,
          status: "pending",
        });
        return { id: Number(result[0].insertId) };
      }),
    deleteChallenge: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db.delete(challenges).where(eq(challenges.id, input.id));
        return { success: true };
      }),
    removePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { db } = await adminSession(ctx);
        if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED" });
        await db.delete(posts).where(eq(posts.id, input.id));
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
