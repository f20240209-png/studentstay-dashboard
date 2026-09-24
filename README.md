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
* **Rea**
