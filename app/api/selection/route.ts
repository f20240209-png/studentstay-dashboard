import { z } from "zod";
import { ApiError, audit, checkRevision, exclusive, failure, json, make, offerIdSchema, readBody, requestIdSchema, revisionSchema, stateWithEvents, userFor, workbook } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const user = await userFor(request, true);
    const body = z.object({ offerId: offerIdSchema, revision: revisionSchema, requestId: requestIdSchema }).strict().parse(await readBody(request));
    return json(await exclusive(body.requestId, user.userId, "selection", body.offerId, async () => {
      const data = await workbook(true); await checkRevision(data, body.revision);
      const offer = data.offers.find(o => o.id === body.offerId);
      if (!offer || offer.status !== "ACTIVE" || offer.eligibility !== "ELIGIBLE") throw new ApiError("Select an eligible, active property from the current comparison.", 409);
      if (data.preferences.selectedOfferId === offer.id) return { data };
      const result = await make("select", { action_id: offer.id });
      if (result.ok !== true) throw new ApiError("The new selection was not confirmed. Refresh to check your records.", 502);
      const after = await workbook(true);
      if (after.preferences.selectedOfferId !== offer.id || !after.preferences.ready || after.offers.filter(o => o.decision === "SELECTED").length !== 1) throw new ApiError("The new selection needs review in the workbook. Withdrawals remain protected.", 502);
      await audit(user.userId, "property_selected", `${offer.name} selected for the synthetic demo. No housing commitment was made.`);
      return { data: await stateWithEvents(false, user.userId) };
    }));
  } catch (error) { return failure(error); }
}
