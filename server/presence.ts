import { createHash } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { sessions, userPresence, users } from "../drizzle/schema";
export { formatPresence } from "../shared/presence-display";

export const PRESENCE_ONLINE_WINDOW_MS = 45_000;

type PresenceRecord = {
  userId: number;
  isOnline: boolean;
  lastSeenAt: Date | string | null;
};

export type PresenceSummary = {
  isOnline: boolean;
  lastSeenAt: Date | null;
};

export function sessionHash(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function sessionTabKey(sessionId: string, tabId: string) {
  return createHash("sha256")
    .update(`${sessionId}:${tabId}`)
    .digest("hex");
}

export function aggregatePresence(
  records: readonly PresenceRecord[],
  now = Date.now()
): Map<number, PresenceSummary> {
  const summaries = new Map<number, PresenceSummary>();
  for (const record of records) {
    const timestamp = record.lastSeenAt
      ? new Date(record.lastSeenAt).getTime()
      : NaN;
    if (!Number.isFinite(timestamp)) continue;
    const existing = summaries.get(record.userId);
    const latest = !existing || timestamp > (existing.lastSeenAt?.getTime() ?? 0)
      ? new Date(timestamp)
      : existing.lastSeenAt;
    const fresh = timestamp <= now + 5_000 && now - timestamp <= PRESENCE_ONLINE_WINDOW_MS;
    summaries.set(record.userId, {
      isOnline: Boolean(existing?.isOnline || (record.isOnline && fresh)),
      lastSeenAt: latest,
    });
  }
  return summaries;
}

export async function getPresenceForUsers(db: any, userIds: number[]) {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return new Map<number, PresenceSummary>();
  const rows = await db
    .select({
      userId: userPresence.userId,
      isOnline: userPresence.isOnline,
      lastSeenAt: userPresence.lastSeenAt,
    })
    .from(userPresence)
    .where(inArray(userPresence.userId, ids));
  return aggregatePresence(rows);
}

async function currentSessionBelongsTo(db: any, userId: number, sessionId: string, now: Date) {
  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        gt(sessions.expiresAt, now),
        eq(users.moderationStatus, "active")
      )
    )
    .limit(1);
  return active.length > 0;
}

export async function markPresenceOnline(
  db: any,
  userId: number,
  sessionId: string,
  tabId: string,
  now = new Date()
) {
  if (!(await currentSessionBelongsTo(db, userId, sessionId, now))) return false;
  await db
    .insert(userPresence)
    .values({
      sessionKey: sessionTabKey(sessionId, tabId),
      sessionHash: sessionHash(sessionId),
      userId,
      isOnline: true,
      lastSeenAt: now,
    })
    .onDuplicateKeyUpdate({
      set: { userId, sessionHash: sessionHash(sessionId), isOnline: true, lastSeenAt: now },
    });
  return true;
}

export async function markPresenceOffline(
  db: any,
  userId: number,
  sessionId: string,
  tabId: string,
  now = new Date()
) {
  if (!(await currentSessionBelongsTo(db, userId, sessionId, now))) return false;
  await db
    .update(userPresence)
    .set({ isOnline: false, lastSeenAt: now })
    .where(
      and(
        eq(userPresence.sessionKey, sessionTabKey(sessionId, tabId)),
        eq(userPresence.userId, userId)
      )
    );
  return true;
}

export async function markSessionOffline(db: any, sessionId: string, now = new Date()) {
  await db
    .update(userPresence)
    .set({ isOnline: false, lastSeenAt: now })
    .where(eq(userPresence.sessionHash, sessionHash(sessionId)));
}
