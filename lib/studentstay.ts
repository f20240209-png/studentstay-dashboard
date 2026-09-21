export const SHEET_URL = process.env.NEXT_PUBLIC_STUDENTSTAY_SHEET_URL || "";
export type Preferences = { budget: number; moveIn: string; latestMoveIn: string; minLease: number; maxLease: number; roomType: string; furnished: boolean; billsPreference: string; bathroomPreference: string; selectedOfferId: string; ready: boolean };
export type Eligibility = "ELIGIBLE" | "INELIGIBLE" | "NEEDS_INFO";
export type Offer = { id: string; row: number; transcriptId: string; agency: string; name: string; address: string; reference: string; quotedRent: number | null; period: string; weeklyRent: number | null; weeklyCost: number | null; bond: number | null; fees: string; available: string; expiry: string; minLease: number | null; maxLease: number | null; roomType: string; bathroom: string; furnished: string; bills: string; amenities: string; confidence: string; missing: string[]; conflicts: string; transcriptLink: string; status: string; decision: string; eligibility: Eligibility; reason: string; score: number; completeness: number; rank: number | null; components: number[] };
export type Transcript = { id: string; received: string; agency: string; text: string; status: string; error: string };
export type Action = { id: string; row: number; type: string; offerId: string; agency: string; recipient: string; subject: string; body: string; hash: string; approval: string; approvedAt: string; status: string; executedAt: string; externalId: string; createdAt: string; approvedHash: string; selectedSnapshot: string };
export type Activity = { id: string; time: string; source: string; entity: string; event: string; outcome: string; details: string };
export type DashboardData = { asOf: string; live: boolean; preferences: Preferences; offers: Offer[]; transcripts: Transcript[]; actions: Action[]; activity: Activity[]; revision: string };
export type PreferenceChanges = Partial<Pick<Preferences, "budget" | "moveIn" | "latestMoveIn" | "minLease" | "maxLease" | "roomType" | "furnished" | "billsPreference" | "bathroomPreference">>;
export type ChatAction = { kind: "preferences"; changes: PreferenceChanges } | { kind: "prepare_closure" } | { kind: "select"; offerId: string };
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; time: string; action?: ChatAction; sources?: string[] };
export type SheetRows = Record<string, (string | number | boolean | null)[][]>;

export function numeric(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}
export function money(v: number | null) { return v == null ? "Unknown" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v); }
export function shortDate(v: string) { if (!v) return "Not confirmed"; const d = new Date(v.length === 10 ? `${v}T12:00:00Z` : v); return Number.isNaN(+d) ? v : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" }).format(d); }
export function records(rows: SheetRows[string] = []) { const headers = rows[0] || []; return rows.slice(1).map((r, i) => ({ _row: i + 2, ...Object.fromEntries(headers.map((h, j) => [String(h), r?.[j] == null ? "" : String(r[j])])) })) as (Record<string, string> & { _row: number })[]; }
export function normalize(sheets: SheetRows, asOf: string, live = false): DashboardData {
  const p = records(sheets.Preferences)[0] || {};
  const rankings = new Map(records(sheets.Rankings).map(r => [r.offer_id, r]));
  const preferences: Preferences = { budget: numeric(p.max_weekly_rent) ?? 450, moveIn: p.move_in_date || "2027-02-01", latestMoveIn: p.latest_move_in_date || "2027-02-10", minLease: numeric(p.min_lease_weeks) ?? 26, maxLease: numeric(p.max_lease_weeks) ?? 52, roomType: p.room_type || "Private bedroom", furnished: p.furnished_required === "TRUE" || p.furnished === "TRUE", billsPreference: p.bills_preference || "Included preferred", bathroomPreference: p.private_bathroom_preference || "Preferred", selectedOfferId: p.selected_offer_id || "", ready: p.selection_ready === "READY" };
  // Older workbook headers use preferred_room_type and furnished_preference.
  const prefValues = sheets.Preferences?.[1] || [];
  preferences.roomType = String(prefValues[7] || preferences.roomType);
  preferences.furnished = String(prefValues[8]).toUpperCase() === "TRUE";
  preferences.billsPreference = String(prefValues[9] || preferences.billsPreference);
  preferences.bathroomPreference = String(prefValues[10] || preferences.bathroomPreference);
  const offers = records(sheets.Offers).filter(o => o.offer_id?.startsWith("OF-")).map(o => {
    const r: Record<string, string> = rankings.get(o.offer_id) || {};
    return { id: o.offer_id, row: o._row, transcriptId: o.transcript_id, agency: o.agency, name: o.property_name, address: o.address, reference: o.provider_reference, quotedRent: numeric(o.quoted_rent), period: o.quoted_period, weeklyRent: numeric(o.weekly_rent), weeklyCost: numeric(o.total_weekly_cost), bond: numeric(o.bond), fees: o.mandatory_fees, available: o.available_from, expiry: o.offer_expiry, minLease: numeric(o.min_lease_weeks), maxLease: numeric(o.max_lease_weeks), roomType: o.room_type, bathroom: o.private_bathroom, furnished: o.furnished, bills: o.bills_included, amenities: o.amenities, confidence: o.extraction_confidence, missing: (o.missing_fields || "").split(/[,;]/).map(x => x.trim()).filter(Boolean), conflicts: o.conflict_flags, transcriptLink: o.transcript_link, status: o.status, decision: o.student_decision, eligibility: (r.eligibility || "NEEDS_INFO") as Eligibility, reason: r.eligibility_reason || "Awaiting calculation", score: numeric(r.match_score) ?? 0, completeness: numeric(r.completeness_score) ?? 0, rank: numeric(r.rank), components: [r.budget_score, r.availability_score, r.room_score, r.lease_score, r.bills_score].map(n => numeric(n) ?? 0) };
  });
  const transcripts = records(sheets.Raw_Transcripts).filter(t => t.transcript_id?.startsWith("TR-")).map(t => ({ id: t.transcript_id, received: t.received_at, agency: t.agency_hint, text: t.transcript, status: t.processing_status, error: t.error_message }));
  const actions = records(sheets.Pending_Actions).filter(a => a.action_id?.startsWith("WD-OF-")).map(a => ({ id: a.action_id, row: a._row, type: a.action_type, offerId: a.offer_id, agency: a.agency, recipient: a.recipient_email, subject: a.subject, body: a.body, hash: a.payload_hash, approval: a.approval_status, approvedAt: a.approved_at, status: a.execution_status, executedAt: a.executed_at, externalId: a.external_message_id, createdAt: a.created_at, approvedHash: a.approved_payload_hash, selectedSnapshot: a.selected_offer_snapshot }));
  const activity = records(sheets.Activity_Log).filter(a => a.event_id).map(a => ({ id: a.event_id, time: a.timestamp, source: a.scenario, entity: a.entity_id, event: a.event, outcome: a.outcome, details: a.details })).reverse();
  return { asOf, live, preferences, offers, transcripts, actions, activity, revision: "" };
}

/** The workbook's V0 rules, used only for a clearly labelled unsaved preview. */
export function previewOffers(offers: Offer[], p: Preferences): Offer[] {
  const result = offers.map(o => {
    const known = [o.weeklyCost != null, !!o.available, o.minLease != null, o.maxLease != null, !!o.roomType && o.roomType !== "UNKNOWN", o.bills === "TRUE" || o.bills === "FALSE"];
    const roomMatch = o.roomType.toLowerCase() === p.roomType.toLowerCase();
    const leaseMatch = o.minLease != null && o.maxLease != null && o.minLease <= p.maxLease && o.maxLease >= p.minLease;
    const reasons: string[] = [];
    if (o.weeklyCost != null && o.weeklyCost > p.budget) reasons.push("Over budget");
    if (o.available && o.available > p.latestMoveIn) reasons.push("Available after your latest move-in");
    if (known[2] && known[3] && !leaseMatch) reasons.push("Lease does not overlap your range");
    if (known[4] && !roomMatch) reasons.push("Room type does not match");
    const eligibility: Eligibility = o.status === "HUMAN_ONLY" ? "NEEDS_INFO" : reasons.length ? "INELIGIBLE" : known.every(Boolean) ? "ELIGIBLE" : "NEEDS_INFO";
    const components = [o.weeklyCost == null ? 0 : Math.max(0, Math.min(100, Math.round(80 + 100 * (p.budget - o.weeklyCost) / p.budget))), !o.available ? 0 : o.available <= p.moveIn ? 100 : o.available <= p.latestMoveIn ? 70 : 0, roomMatch ? 100 : 0, leaseMatch ? 100 : 0, o.bills === "TRUE" ? 100 : 0];
    const score = Math.round(components.reduce((total, n, i) => total + n * [0.4, 0.2, 0.15, 0.15, 0.1][i], 0) * 10) / 10;
    return { ...o, eligibility, reason: o.status === "HUMAN_ONLY" ? "Payment or immediate acceptance request: human review required" : reasons.join("; ") || (eligibility === "ELIGIBLE" ? "Passed all hard filters" : "Missing critical information"), score, components, completeness: Math.round(known.filter(Boolean).length / 6 * 100), rank: null as number | null };
  });
  for (const o of result) if (o.eligibility === "ELIGIBLE") o.rank = 1 + result.filter(x => x.eligibility === "ELIGIBLE" && x.score > o.score).length;
  return result;
}
export function sortOffers(offers: Offer[]) { const order = { ELIGIBLE: 0, NEEDS_INFO: 1, INELIGIBLE: 2 }; return [...offers].sort((a, b) => order[a.eligibility] - order[b.eligibility] || b.score - a.score || a.name.localeCompare(b.name)); }
export const preferenceLabels: Record<keyof PreferenceChanges, string> = { budget: "Weekly budget", moveIn: "Preferred move-in", latestMoveIn: "Latest move-in", minLease: "Minimum lease", maxLease: "Maximum lease", roomType: "Room type", furnished: "Furnished", billsPreference: "Bills preference", bathroomPreference: "Bathroom preference" };
export function displayPreference(key: string, value: unknown) { if (key === "budget") return money(Number(value)); if (key === "moveIn" || key === "latestMoveIn") return shortDate(String(value)); if (key === "minLease" || key === "maxLease") return `${value} weeks`; if (key === "furnished") return value ? "Required" : "Not required"; return String(value); }
