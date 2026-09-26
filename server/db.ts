import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { notifications, InsertUser, sessions, users } from "../drizzle/schema";
let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); } } return _db; }
export async function upsertUser(user: InsertUser): Promise<void> { const db = await getDb(); if (!db || !user.openId) return; const values = { ...user, lastSignedIn: user.lastSignedIn ?? new Date() }; await db.insert(users).values(values).onDuplicateKeyUpdate({ set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn } }); }
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function getUserById(id: number) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.id, id)).limit(1); return result[0]; }
export async function getUserBySession(sessionId: string) { const db = await getDb(); if (!db) return undefined; const rows = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date()))).limit(1); return rows[0]?.user; }
export async function getUnreadNotifications(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).orderBy(desc(notifications.createdAt)).limit(30); }
