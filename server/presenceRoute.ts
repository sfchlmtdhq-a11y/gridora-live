import type { Express } from "express";
import { getDb, getUserBySession } from "./db";
import { markPresenceOffline } from "./presence";

function readSessionId(req: { headers: { cookie?: string } }) {
  return (req.headers.cookie ?? "")
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith("gridora_session="))
    ?.slice("gridora_session=".length);
}

export function registerPresenceRoutes(app: Express) {
  app.post("/api/presence/leave", async (req, res) => {
    try {
      const sessionId = readSessionId(req);
      const tabId = req.body?.tabId;
      if (!sessionId || typeof tabId !== "string" || !/^[0-9a-f-]{36}$/i.test(tabId)) {
        res.status(204).end();
        return;
      }
      const [user, db] = await Promise.all([getUserBySession(sessionId), getDb()]);
      if (user && db)
        await markPresenceOffline(db, user.id, sessionId, tabId);
      res.status(204).end();
    } catch {
      // Presence is best-effort at page exit; stale heartbeats expire server-side.
      res.status(204).end();
    }
  });
}
