import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { z } from "zod";
import { normalize, type Action, type ChatMessage, type DashboardData, type PreferenceChanges, type Preferences, type SheetRows } from "./studentstay";

export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function db() { if (!env.DB) throw new ApiError("Your workspace storage is temporarily unavailable. Please try again.", 503); return env.DB; }
export async function userFor(request: Request, writing = false) {
  const user = await getChatGPTUser();
  if (!user) throw new ApiError("Sign in to your private StudentStay workspace to continue.", 401);
  if (writing && request.headers.get("origin") !== new URL(request.url).origin) throw new ApiError("Open the dashboard to make this change.", 403);
  return user;
}
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
export function failure(error: unknown) { console.error("StudentStay request failed", error instanceof Error ? error.message : "unknown error"); if (error instanceof z.ZodError) return json({ error: "Check the requested values. Dates must be valid, and only supported preference fields can change." }, 400); return json({ error: error instanceof ApiError ? error.message : "The request could not be completed. Your saved records are available after a refresh." }, error instanceof ApiError ? error.status : 503); }
export async function readBody(request: Request) { if ((Number(request.headers.get("content-length")) || 0) > 18000) throw new ApiError("This request is too large.", 413); const raw = await request.text(); if (raw.length > 18000) throw new ApiError("This request is too large.", 413); try { return JSON.parse(raw) as unknown; } catch { throw new ApiError("The request was not valid JSON."); } }
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const date = new Date(`${v}T12:00:00Z`); return Number.isFinite(+date) && date.toISOString().slice(0, 10) === v; });
export const changeSchema = z.object({ budget: z.number().finite().min(1).max(5000).optional(), moveIn: isoDate.optional(), latestMoveIn: isoDate.optional(), minLease: z.number().int().min(1).max(104).optional(), maxLease: z.number().int().min(1).max(104).optional(), roomType: z.enum(["Private bedroom", "Studio", "Shared bedroom"]).optional(), furnished: z.boolean().optional(), billsPreference: z.enum(["Included required", "Included preferred", "No preference"]).optional(), bathroomPreference: z.enum(["Required", "Preferred", "No preference"]).optional() }).strict();
export const requestIdSchema = z.string().uuid();
export const offerIdSchema = z.string().regex(/^OF-[a-f0-9]{16}$/);
export const actionIdSchema = z.string().regex(/^WD-OF-[a-f0-9]{16}(?:-FOR-OF-[a-f0-9]{16})?$/);
export const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const TEST_RECIPIENT = env.STUDENTSTAY_TEST_RECIPIENT || "demo@example.invalid";

export async function digest(value: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join(""); }
export async function payloadHash(a: Action) { const fields = [a.id, a.type, a.offerId, a.agency, a.recipient, a.subject, a.body, a.selectedSnapshot]; return digest(["StudentStay-v0-payload-1", ...fields.flatMap(v => [String(v.length), v])].join("|")); }
export async function make(action: "read" | "preferences" | "chat" | "select" | "prepare" | "approve" | "execute", fields: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const endpoint = env.STUDENTSTAY_MAKE_URL; const token = env.STUDENTSTAY_MAKE_SECRET;
  if (!endpoint || !token) throw new ApiError("The StudentStay connection is not configured yet.", 503);
  let response: Response;
  try { response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, action, token }), signal: AbortSignal.timeout(55000) }); }
  catch { throw new ApiError(action === "read" || action === "chat" ? "Make could not be reached. Please try again shortly." : "Confirmation from Make timed out. Refresh to check the saved result before trying again.", 503); }
  const text = await response.text();
  let result: Record<string, unknown>;
  try { result = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { throw new ApiError("Make has not confirmed the result. Refresh the workspace before repeating an action.", 503); }
  if (!response.ok || result.error) throw new ApiError(typeof result.error === "string" ? result.error : "Make could not complete that request.", 502);
  return result;
}

export async function workbook(fresh = false): Promise<DashboardData> {
  if (!fresh) {
    const cached = await db().prepare("SELECT payload, updated_at FROM source_cache WHERE id = ?").bind("workbook").first<{ payload: string; updated_at: number }>();
    if (cached && Date.now() - cached.updated_at < 45000) return JSON.parse(cached.payload) as DashboardData;
  }
  const response = await make("read");
  const schema = z.object({ valueRanges: z.array(z.object({ range: z.string(), values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).optional() })) });
  const value = schema.safeParse(response);
  if (!value.success) throw new ApiError("The workbook returned an incomplete response. Please refresh.", 502);
  const sheets: SheetRows = {};
  for (const range of value.data.valueRanges) sheets[range.range.split("!")[0].replace(/^'|'$/g, "")] = range.values || [];
  const required = ["Preferences", "Raw_Transcripts", "Offers", "Rankings", "Pending_Actions", "Activity_Log"];
  if (!required.every(tab => Array.isArray(sheets[tab]) && sheets[tab].length > 0) || sheets.Preferences[1]?.[0] !== "TEST-001") throw new ApiError("The StudentStay workbook structure has changed. No updates have been applied.", 409);
  if (Object.values(sheets).some(rows => rows.some(row => row.some(c => typeof c === "string" && /^#(REF!|VALUE!|DIV\/0!|ERROR!|N\/A)/.test(c))))) throw new ApiError("A workbook formula needs review. Changes are paused until it is corrected.", 409);
  const data = normalize(sheets, new Date().toISOString(), true);
  validatePreferences(data.preferences);
  data.revision = await digest(JSON.stringify([data.preferences, data.offers.map(o => [o.id, o.row, o.status, o.decision, o.eligibility, o.score]), data.actions.map(a => [a.id, a.row, a.hash, a.status, a.approval, a.approvedHash])]));
  await db().prepare("INSERT INTO source_cache (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at").bind("workbook", JSON.stringify(data), Date.now()).run();
  return data;
}
export async function stateWithEvents(fresh = false, userId?: string) {
  const data = await workbook(fresh);
  if (userId) {
    const events = await db().prepare("SELECT id, event, details, created_at FROM dashboard_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 40").bind(userId).all<{ id: string; event: string; details: string; created_at: string }>();
    data.activity = [...events.results.map(e => ({ id: e.id, time: e.created_at, source: "StudentStay dashboard", entity: "TEST-001", event: e.event, outcome: "RECORDED", details: e.details })), ...data.activity];
  }
  return data;
}
export async function audit(userId: string, event: string, details: string) { await db().prepare("INSERT INTO dashboard_events (id, user_id, event, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, event, details, new Date().toISOString()).run(); }
export async function checkRevision(data: DashboardData, revision: string) { if (data.revision !== revision) throw new ApiError("Your workbook has changed since this view loaded. Refresh, then review the latest values.", 409); }
export function validatePreferences(p: Preferences) { changeSchema.parse({ budget: p.budget, moveIn: p.moveIn, latestMoveIn: p.latestMoveIn, minLease: p.minLease, maxLease: p.maxLease, roomType: p.roomType, furnished: p.furnished, billsPreference: p.billsPreference, bathroomPreference: p.bathroomPreference }); if (p.latestMoveIn < p.moveIn || p.maxLease < p.minLease) throw new ApiError("The latest move-in and maximum lease must come after their minimum values."); }
export async function exclusive<T>(requestId: string, userId: string, kind: string, payload: unknown, action: () => Promise<T>): Promise<T> {
  const existing = await db().prepare("SELECT state FROM action_requests WHERE id = ?").bind(requestId).first<{ state: string }>();
  if (existing) throw new ApiError("This request has already been received. Refresh to see its result.", 409);
  await db().prepare("DELETE FROM request_locks WHERE id = ? AND expires_at < ?").bind("sheet-write", Date.now()).run();
  const lock = await db().prepare("INSERT OR IGNORE INTO request_locks (id, expires_at) VALUES (?, ?)").bind("sheet-write", Date.now() + 300000).run();
  if (!lock.meta.changes) throw new ApiError("Another change is being processed. Please wait and refresh.", 409);
  let succeeded = false;
  try {
    await db().prepare("INSERT INTO action_requests (id, user_id, kind, state, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(requestId, userId, kind, "PROCESSING", JSON.stringify(payload), new Date().toISOString()).run();
    const result = await action(); succeeded = true;
    await db().prepare("UPDATE action_requests SET state = ? WHERE id = ?").bind("COMPLETE", requestId).run();
    return result;
  } catch (error) {
    await db().prepare("UPDATE action_requests SET state = ? WHERE id = ?").bind(error instanceof ApiError && error.status < 500 ? "BLOCKED" : "REVIEW_REQUIRED", requestId).run();
    if (error instanceof ApiError && error.status < 500) succeeded = true;
    throw error;
  } finally {
    // An uncertain external response keeps the short lock; it is never retried automatically.
    if (succeeded) await db().prepare("DELETE FROM request_locks WHERE id = ?").bind("sheet-write").run();
  }
}
export async function messages(userId: string): Promise<ChatMessage[]> {
  const result = await db().prepare("SELECT payload FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 60").bind(userId).all<{ payload: string }>();
  return result.results.reverse().map(r => JSON.parse(r.payload) as ChatMessage);
}
export async function assertApproval(data: DashboardData, actionId: string, expectedHash: string) {
  const a = data.actions.find(x => x.id === actionId); const offer = data.offers.find(o => o.id === a?.offerId);
  if (!a || !offer) throw new ApiError("This withdrawal proposal is no longer available.", 404);
  if (a.status !== "NOT_SENT") throw new ApiError("This action was already used or needs manual review. It cannot run again.", 409);
  if (a.type !== "WITHDRAW_ENQUIRY" || a.recipient !== TEST_RECIPIENT) throw new ApiError("Only withdrawal test drafts to your verified inbox are supported.", 403);
  if (!data.preferences.ready || a.selectedSnapshot !== data.preferences.selectedOfferId || offer.id === data.preferences.selectedOfferId || offer.decision === "SELECTED" || offer.status !== "ACTIVE") throw new ApiError("The selection or enquiry has changed. Prepare and review a current proposal.", 409);
  if (a.hash !== expectedHash || await payloadHash(a) !== a.hash) throw new ApiError("The message changed after review. Refresh and review the exact current message.", 409);
  return a;
}
