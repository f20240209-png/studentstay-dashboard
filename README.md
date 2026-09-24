# StudentStay Dashboard

A human-in-the-loop student accommodation copilot for comparing rental offers, tracking agency conversations, and making safer, evidence-based decisions.

StudentStay turns unstructured property-call transcripts into structured offers, ranks them against a student’s preferences, and keeps sensitive actions—such as withdrawing interest—behind explicit human approval.

## What it does

* Displays a ranked shortlist of student accommodation offers
* Compares rent, bills, move-in date, lease length, room type, furnishing, bathroom and missing information
* Shows the original source transcript behind each offer
* Lets the student adjust preferences and preview ranking changes
* Provides a grounded chat interface for questions about the current offers
* Supports approval-gated withdrawal draft preparation
* Keeps a clear activity trail for important actions

## Safety model

StudentStay is designed to assist—not replace—the student.

* It does not sign leases, pay deposits, or make bookings
* It does not send emails automatically
* A withdrawal action requires individual human approval
* Approval is tied to the exact reviewed message payload
* Test drafts are restricted to an approved test recipient
* Property facts are only taken from stored source records; unknown information stays unknown

## Architecture

```text
Google Sheets
    ↓
Make automation
    ↓
StudentStay Dashboard
    ↓
Human review and approval
```

* **Google Sheets** is the operational source of truth for preferences, transcripts, offers, actions and activity logs.
* **Make** interprets transcripts, applies workflow rules and handles guarded actions.
* **React + TypeScript** power the dashboard interface.
* **Cloudflare Workers-compatible runtime** provides API routes and local database support.

## Ranking logic

Offers are evaluated against the student’s preferences using deterministic scoring.

V0 hard filters:

* Weekly budget
* Latest acceptable move-in date
* Room type
* Lease overlap

The current scoring model uses these weights:

| Factor                  | Weight |
| ----------------------- | -----: |
| Budget fit              |    40% |
| Move-in fit             |    20% |
| Room type fit           |    15% |
| Lease fit               |    15% |
| Preference completeness |    10% |

Offers with missing or conflicting data are clearly marked instead of being silently treated as suitable.

## Run locally

### Requirements

* Node.js 24+
* pnpm 11.25.0+
* VS Code recommended

### Setup

```bash
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:local
pnpm dev
```

The included version runs with safe synthetic sample data. You can explore the dashboard, property details, transcript view and preference preview without connecting any external services.

## Optional Make connection

To connect the dashboard to the existing Make workflow, create a local `.env` file:

```env
STUDENTSTAY_MAKE_URL=
STUDENTSTAY_MAKE_SECRET=
STUDENTSTAY_TEST_RECIPIENT=
NEXT_PUBLIC_STUDENTSTAY_SHEET_URL=
```

The Make connection is optional for local design work. When connected, it can read and update the linked StudentStay workbook, so use an approved test recipient and retain all approval safeguards.

## Project structure

| Area                                | Location                               |
| ----------------------------------- | -------------------------------------- |
| Dashboard UI                        | `components/studentstay/dashboard.tsx` |
| Styling                             | `app/globals.css`                      |
| Sample data                         | `lib/current-sheet.json`               |
| Ranking helpers and types           | `lib/studentstay.ts`                   |
| API and Make integration safeguards | `lib/server.ts`                        |
| Chat behaviour                      | `app/api/chat/route.ts`                |
| Preference updates                  | `app/api/preferences/route.ts`         |
| Approval-gated actions              | `app/api/actions/route.ts`             |
| Database schema and migrations      | `db/` and `drizzle/`                   |

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

The test suite checks ranking behaviour, preference changes, approval payload integrity, authentication, request origin rules, replay protection and uncertain external responses. It does not send emails or make live external calls.

## Roadmap

* Connect real inbound agency-call handling through a voice platform
* Extract and validate multiple offers from conversations
* Add a production authentication system
* Deploy the dashboard through a personal cloud account
* Attach a custom domain
* Keep all outbound decline actions approval-gated

## Disclaimer

This is a portfolio/demo project using synthetic property data. It is not legal, financial or tenancy advice.

## Future vision

StudentStay’s long-term goal is to become a practical accommodation copilot for students moving to a new city—reducing repeated calls, scattered property information and missed follow-ups while keeping the student in control.

### Voice-agent assisted calls

A future voice agent could answer or place property-enquiry calls after the student gives permission. It would introduce itself clearly as an AI assistant, use the student’s current preferences, and collect only relevant property details such as:

* Weekly rent, bills and bond
* Room type, furnishing and bathroom details
* Availability and earliest move-in date
* Lease duration and application requirements
* Missing details that need follow-up

After each call, the system would store the transcript, extract structured facts, flag uncertainty or conflicting information, and update the ranked shortlist for the student to review.

### Preference-aware automation

The student would manage their preferences through the dashboard or chatbot—for example, changing budget, move-in date, room type or lease period. Future calls and rankings would use the latest saved preferences automatically, without rebuilding the workflow each time.

### Human control remains central

The system should never make irreversible housing decisions by itself.

* The student reviews every extracted offer and recommendation
* The voice agent must disclose that it is an AI assistant
* No lease signing, payment, deposit or booking can be automated
* Any “not interested” or withdrawal communication requires explicit human approval
* Approval remains tied to the exact reviewed recipient and message content
* The system records an audit trail of important actions

### Future technical direction

* Voice platform integration for inbound and approved outbound calls
* Real-time transcript ingestion and structured offer extraction
* Follow-up question generation for missing information
* Better preference management and notification workflows
* Production authentication, secure cloud database and deployment
* Custom domain and mobile-friendly dashboard access

The current V0 demonstrates the foundation: structured transcripts, deterministic ranking, evidence-based review and approval-gated actions. The voice agent is a planned extension built on top of that controlled workflow.


## Credits

RMIT City campus photograph: Donaldytong, Wikimedia Commons, CC BY-SA 3.0. The image provides campus context only and does not depict a sample property.

