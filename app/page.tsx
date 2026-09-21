import Dashboard from "@/components/studentstay/dashboard";
import snapshot from "@/lib/current-sheet.json";
import { normalize, type SheetRows } from "@/lib/studentstay";
import { requireChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
 await requireChatGPTUser("/");
 return <Dashboard initial={normalize(snapshot.sheets as SheetRows, snapshot.asOf, false)} />;
}
