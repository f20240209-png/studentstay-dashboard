import { failure, json, stateWithEvents, userFor } from "@/lib/server";
export async function GET(request: Request) { try { const user = await userFor(request); return json(await stateWithEvents(new URL(request.url).searchParams.get("fresh") === "1", user.userId)); } catch (error) { return failure(error); } }
