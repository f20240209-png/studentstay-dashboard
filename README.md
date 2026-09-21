# StudentStay Dashboard

The editable source of Adarsh's StudentStay dashboard: property comparisons, source transcripts, a preference editor, a grounded chatbot and individually approved test withdrawal drafts.

**Start with [START_HERE.md](START_HERE.md).** It walks through opening this project on Windows in VS Code, running it locally, and creating a GitHub repository.

The dashboard layout, styling, components and nine synthetic sample properties come from the existing working dashboard. This export includes sanitized sample records instead of private workbook links, inbox details or connection credentials. The existing hosted dashboard is a separate deployment.

## Local setup

Install Node.js 24 and VS Code. Open a terminal in this folder:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:local
pnpm dev
```

Open http://localhost:5173. Keep that terminal running while editing. Local setup creates an ignored `.env` file and local SQLite storage; it does not create a Cloudflare account or modify a remote database. The sample cards, details, transcripts and unsaved preference preview are available without credentials. Live chatbot responses and saved changes require the existing Make connection, configured below. A connection warning is expected while these settings are blank.

## Files to edit

| Change | File |
|---|---|
| Dashboard layout, cards, navigation, forms and chat panel | `components/studentstay/dashboard.tsx` |
| Colours, spacing, typography and responsive styles | `app/globals.css` |
| Page title and metadata | `app/layout.tsx` |
| Sample properties and transcripts | `lib/current-sheet.json` |
| Data types, display helpers and unsaved ranking preview | `lib/studentstay.ts` |
| Make integration, validation and approval safeguards | `lib/server.ts` |
| Chatbot instructions and proposed changes | `app/api/chat/route.ts` |
| Saving preferences | `app/api/preferences/route.ts` |
| Saving property selection | `app/api/selection/route.ts` |
| Preparing and approving withdrawal drafts | `app/api/actions/route.ts` |
| Database tables and migrations | `db/schema.ts` and `drizzle/` |

Start with a small label or colour change. Saving the file updates the local page. Editing locally does not change the hosted dashboard until you deploy that revision.

## Connect the existing Make workflow

Edit your local `.env` file. Obtain the values privately from the existing StudentStay configuration:

```dotenv
STUDENTSTAY_MAKE_URL=your_existing_dashboard_webhook
STUDENTSTAY_MAKE_SECRET=the_matching_router_secret
STUDENTSTAY_TEST_RECIPIENT=your_verified_test_inbox
NEXT_PUBLIC_STUDENTSTAY_SHEET_URL=your_workbook_url
```

The last value is an optional public browser link; it is not a credential. The other settings stay server-side. Restart `pnpm dev` after editing `.env`.

A connected local copy reads and writes the same workbook as the live dashboard. Once connected, saving a preference changes that real project workbook, and explicitly approving a test draft can create a Gmail draft. The connected Make scenario must retain its existing recipient allowlist and approval checks. Keep these settings blank while making appearance-only changes if you want to avoid touching live records.

No secret values are included in this download. `.env`, local database state, dependencies, compiled files and local runtime files are excluded from Git. The sample action hashes were recalculated for the sanitized recipient; they are sample records, not authorization for real messages.

## Architecture

React and TypeScript provide the dashboard. Vinext implements the Next.js-style routes on Vite with a Cloudflare Workers runtime. Google Sheets is the operational source of truth. The local D1-compatible database stores chat, activity, cached reads and request locks. Make handles Sheets access, AI interpretation and guarded draft creation.

The bridge accepts `read`, `chat`, `preferences`, `select`, `prepare`, `approve`, and `execute`. Its existing `action_id` field identifies the property or withdrawal. The `prompt` text field carries the chat prompt or, for approval, the reviewed payload hash. Execution uses `mode` to distinguish validation from draft creation.

Preferences drive deterministic scores with weights 40/20/15/15/10. V0 hard filters are budget, latest move-in, room type and lease overlap. Human-only enquiries are excluded from automatic closure. Every withdrawal approval is tied to its exact recipient, subject, body and selected property. The Make executor rechecks the record and claims it once before creating a draft. There is no automatic email sending or connected voice calling in this V0.

## Verification

```powershell
pnpm typecheck
pnpm test
pnpm build
```

The tests cover nine baseline rankings, incomplete and human-only offers, preference changes, exact message hashes, authentication, origin checks, stale selection, replay protection and uncertain external responses. They create no messages and make no network calls.

See `START_HERE.md` for what has been checked on the exported copy. Applied database migrations should not be rewritten; create a new migration for later schema changes.

## GitHub and a new web address

See the exact Git commands in `START_HERE.md`. Uploading source to GitHub does not itself deploy this full-stack dashboard. Start with a private repository if you will add personal content.

Two deployment paths preserve this design:

1. Keep the current managed hosting and attach a custom domain you own. The live deployment continues to use its existing private sign-in. Your laptop and GitHub hold editable source; deployment remains a separate step.
2. Move hosting into your own account, such as Cloudflare. This requires production authentication, a real D1 binding, runtime secrets and a deployment setup. The current local sign-in is only a loopback development identity; it is not a production login system. The `.openai/hosting.json` in this export intentionally contains no live project ID, and `wrangler.local.jsonc` contains a local-only placeholder database ID. Do not use those placeholders to deploy a public app.

After an independent deployment is configured, the host can use its own address or a domain you own. This export does not create a GitHub repository, register a domain, migrate production authentication or change the existing live URL.

## Credits

RMIT City campus photograph: Donaldytong, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:RMIT_University_City_Campus_(Building_8).jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), displayed cropped. It is campus context, not a photograph of a sample property. Keep the attribution when reusing the image.

Vendored helper and style licences are preserved alongside their files.
