import { z } from "zod";
import { audit, changeSchema, checkRevision, exclusive, failure, json, make, readBody, requestIdSchema, revisionSchema, stateWithEvents, userFor, validatePreferences, workbook, ApiError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const user = await userFor(request, true);
    const body = z.object({ changes: changeSchema, revision: revisionSchema, requestId: requestIdSchema }).strict().parse(await readBody(request));
    if (!Object.keys(body.changes).length) throw new ApiError("There are no preference changes to save.");
    return json(await exclusive(body.requestId, user.userId, "preferences", body.changes, async () => {
      const before = await workbook(true); await checkRevision(before, body.revision);
      const p = { ...before.preferences, ...body.changes }; validatePreferences(p);
      const result = await make("preferences", { budget: p.budget, move_in: p.moveIn, latest_move_in: p.latestMoveIn, min_lease: p.minLease, max_lease: p.maxLease, room_type: p.roomType, furnished: p.furnished ? "TRUE" : "FALSE", bills_preference: p.billsPreference, bathroom_preference: p.bathroomPreference });
      if (result.ok !== true) throw new ApiError("The preference update was not confirmed. Refresh to check your records.", 502);
      const after = await workbook(true);
      if (Object.entries(body.changes).some(([k, v]) => after.preferences[k as keyof typeof p] !== v)) throw new ApiError("The saved preferences could not be verified. Refresh before continuing.", 502);
      await audit(user.userId, "preferences_updated", Object.entries(body.changes).map(([k, v]) => `${k}: ${before.preferences[k as keyof typeof p]} → ${v}`).join("; "));
      return { data: await stateWithEvents(false, user.userId) };
    }));
  } catch (error) { return failure(error); }
}
