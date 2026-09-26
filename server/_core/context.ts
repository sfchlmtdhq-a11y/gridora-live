import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserBySession } from "../db";
export type TrpcContext = { req: CreateExpressContextOptions["req"]; res: CreateExpressContextOptions["res"]; user: User | null };
function readCookie(req: CreateExpressContextOptions["req"], name: string) { const raw = req.headers.cookie ?? ""; const value = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`)); return value?.slice(name.length + 1); }
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> { const sessionId = readCookie(opts.req, "gridora_session"); const user = sessionId ? ((await getUserBySession(sessionId)) ?? null) : null; return { req: opts.req, res: opts.res, user }; }
