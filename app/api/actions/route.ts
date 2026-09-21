import { z } from "zod";
import { actionIdSchema, ApiError, assertApproval, audit, checkRevision, exclusive, failure, json, make, readBody, requestIdSchema, revisionSchema, stateWithEvents, userFor, workbook } from "@/lib/server";
export async function POST(request: Request) {
  try {
    const user = await userFor(request, true);
    const body = z.discriminatedUnion("operation", [z.object({ operation: z.literal("prepare"), revision: revisionSchema, requestId: requestIdSchema }).strict(), z.object({ operation: z.literal("approve"), actionId: actionIdSchema, expectedHash: revisionSchema, revision: revisionSchema, requestId: requestIdSchema }).strict()]).parse(await readBody(request));
    return json(await exclusive(body.requestId, user.userId, body.operation, body, async () => {
      const data = await workbook(true); await checkRevision(data, body.revision);
      if (body.operation === "prepare") {
        if (!data.preferences.ready) throw new ApiError("Select an eligible property before preparing withdrawals.", 409);
        const candidates = data.offers.filter(o => o.status === "ACTIVE" && o.id !== data.preferences.selectedOfferId && o.decision !== "SELECTED");
        if (candidates.every(o => data.actions.some(a => a.offerId === o.id && a.selectedSnapshot === data.preferences.selectedOfferId))) return { data, message: "Your current withdrawal proposals are already available below." };
        const result = await make("prepare");
        if (result.result !== "PENDING_REVIEW") throw new ApiError(`Withdrawal preparation was stopped: ${String(result.result || "unconfirmed")}. Refresh to review the current state.`, 409);
        await audit(user.userId, "withdrawals_prepared", `Prepared ${Number(result.proposals_created || 0)} proposals for individual review. No emails created or sent.`);
        return { data: await stateWithEvents(true, user.userId), message: "Your withdrawal proposals are ready for review." };
      }
      const action = await assertApproval(data, body.actionId, body.expectedHash);
      const approval = await make("approve", { action_id: action.id, prompt: action.hash });
      if (approval.ok !== true) throw new ApiError("The approval was not confirmed. Refresh to review the action.", 502);
      const verified = await workbook(true); const approved = await assertApproval(verified, body.actionId, body.expectedHash);
      if (approved.approval !== "APPROVED" || approved.approvedHash !== approved.hash || !approved.approvedAt) throw new ApiError("The approval record is incomplete. No draft was requested.", 409);
      await audit(user.userId, "withdrawal_approved", `Approved the exact recipient, subject and body for ${action.id}.`);
      const result = await make("execute", { action_id: action.id, mode: "CREATE_DRAFT" });
      const after = await workbook(true); const completed = after.actions.find(a => a.id === action.id);
      if (result.result !== "DRAFTED" || completed?.status !== "DRAFTED" || !completed.externalId) throw new ApiError(`Draft creation stopped: ${String(result.result || "confirmation unavailable")}. Refresh to inspect the record; do not retry automatically.`, 409);
      await audit(user.userId, "test_draft_created", `Created one Gmail draft for ${action.id}. No message was sent.`);
      return { data: await stateWithEvents(false, user.userId), message: "Your approved test draft was created in Gmail. Nothing was sent." };
    }));
  } catch (error) { return failure(error); }
}
