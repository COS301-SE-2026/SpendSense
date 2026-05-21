# SpendSense API Contract

**Project:** SpendSense  
**Team:** MARK2,  COS 301 Capstone 2026  
**Document location:** `docs/srs/api-contract.md`  
**Backend base URL:** `http://localhost:3000/api/v1`  
**Stack:** NestJS + Prisma (backend) · React + TypeScript (frontend) · Supabase Auth · PostgreSQL

---
## 1. Purpose
This spec  defines the data contract and API boundary rules between our frontend app and the NestJS backend for SpendSense. It provides a single source of truth for routing architecture, payload structures, validation, and database side effects.
Following this contract ensures that the frontend team can implement all the views for the Demo 1 core loop without needing to know the internal backend code. This loop includes user login, creating obligations, auto-generating calendar occurrences, gamification tracking, and updating the dashboard widgets.

---
## 2. Demo 1 Scope
Demo 1 must demonstrate the complete SpendSense behavioural loop:
```
User signs in -> creates obligation -> backend generates payment occurrences
-> user views upcoming payments -> user logs payment
-> backend updates score and gamification -> dashboard reflects the change
```

| Status label | Meaning |
|---|---|
| `DEMO_1_REQUIRED` | Must be implemented for the Demo 1 core flow. |
| `DEMO_1_RECOMMENDED` | Strongly recommended for integration quality and demo completeness. |
| `FUTURE` | Documented for architectural continuity; not required for Demo 1. |

---
## 3. API-Wide Conventions
### 3.1 Base path
All routes are prefixed with `/api/v1`. Example: `GET /api/v1/dashboard`
### 3.2 Authentication
SpendSense uses Supabase Auth on the frontend. The NestJS backend validates the resulting JWT on every protected request.
```
React frontend -> Supabase Auth login -> receives access token
-> sends token to NestJS as Bearer header
-> NestJS validates JWT -> resolves or creates internal User
-> protected request continues
```
Protected request header:
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```
The backend never stores passwords. Supabase owns signup, login, logout, and session refresh.
### 3.3 Internal user resolution
Every protected endpoint must:
1. Extract the `sub` claim from the JWT
2. Find the internal `User` where `supabaseAuthId` matches
3. Use the internal `User.id` for all queries,  never a client-supplied `userId`
### 3.4 Response envelope
**Single object:**
```json
{ "data": {} }

**Paginated list:**
```json
{
  "data": [],
  "meta": { "page": 1, "perPage": 20, "total": 42, "totalPages": 3 }
}

**Error:**
```json
{
  "statusCode": 400,
  "message": "Payment amount must be greater than zero",
  "timestamp": "2026-05-18T10:30:00.000Z",
  "path": "/api/v1/payments/log"
}
```
### 3.5 Pagination
All list endpoints accept `?page=1&perPage=20`. Max `perPage` is 100.
### 3.6 Dates and amounts
- Date-only fields: `"2026-06-01"` (ISO date string)
- Timestamps: `"2026-06-01T10:00:00.000Z"` (ISO 8601 UTC)
- Monetary amounts: decimal number `199.00`,  use decimal-safe types in Prisma, not floating point arithmetic
### 3.7 Ownership and security
Every endpoint receiving an entity ID must verify:
1. The record exists
2. The record belongs to the authenticated user
3. The record has not been soft-deleted
Return `404` rather than `403` when another user's ID is supplied, to avoid exposing record existence.

---
## 4. Shared Enums
```ts
type ObligationType        = 'RENT' | 'SUBSCRIPTION' | 'BNPL' | 'UTILITY' | 'IOU' | 'CUSTOM'
type ObligationStatus      = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
type PaymentFrequency      = 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENTS'
type OccurrenceStatus      = 'PENDING' | 'PAID' | 'PAID_LATE' | 'OVERDUE' | 'MISSED' | 'CANCELLED'
type PaymentRecordStatus   = 'ON_TIME' | 'LATE'
type ScoreTier             = 'BUILDING' | 'FAIR' | 'GOOD' | 'EXCELLENT' | 'ELITE'
type UserEventType         = 'USER_BOOTSTRAPPED' | 'OBLIGATION_CREATED' | 'PAYMENT_ON_TIME' | 'PAYMENT_LATE'
type RewardTransactionType = 'EARNED' | 'SPENT' | 'ADJUSTED'
type ReminderChannel       = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS'
```
Score tier ranges: `BUILDING` <450 · `FAIR` 450–549 · `GOOD` 550–649 · `EXCELLENT` 650–749 · `ELITE` 750–850.

---
## 5. Endpoint Summary
| Status | Method | Path | Purpose |
|---|---|---|---|
| `DEMO_1_REQUIRED` | GET | `/health` | Backend and dependency health check |
| `DEMO_1_REQUIRED` | GET | `/users/me` | Bootstrap or return the current user |
| `DEMO_1_RECOMMENDED` | PATCH | `/users/me` | Update safe profile fields |
| `DEMO_1_REQUIRED` | GET | `/categories` | Return seeded categories for forms |
| `DEMO_1_REQUIRED` | POST | `/obligations` | Create obligation, schedule, occurrences |
| `DEMO_1_REQUIRED` | GET | `/obligations` | List the user's active obligations |
| `DEMO_1_RECOMMENDED` | GET | `/obligations/:id` | Obligation detail view |
| `DEMO_1_RECOMMENDED` | PATCH | `/obligations/:id` | Update obligation |
| `DEMO_1_RECOMMENDED` | DELETE | `/obligations/:id` | Archive obligation |
| `DEMO_1_REQUIRED` | GET | `/payment-occurrences/upcoming` | Calendar/timeline payment items |
| `DEMO_1_RECOMMENDED` | GET | `/payment-occurrences/:id` | Single occurrence detail |
| `DEMO_1_REQUIRED` | POST | `/payments/log` | Log payment and trigger all consequences |
| `DEMO_1_RECOMMENDED` | GET | `/payments` | Payment history |
| `DEMO_1_REQUIRED` | GET | `/credit-profile` | Current score and tier |
| `DEMO_1_REQUIRED` | GET | `/credit-profile/events` | Score explanation history |
| `DEMO_1_REQUIRED` | GET | `/gamification/profile` | Coins, XP, streaks, mascot state |
| `DEMO_1_RECOMMENDED` | GET | `/gamification/rewards` | Coin/reward transaction history |
| `DEMO_1_RECOMMENDED` | GET | `/gamification/badges` | Badge shelf with earned/locked state |
| `DEMO_1_REQUIRED` | GET | `/dashboard` | Aggregated home screen data |
| `DEMO_1_RECOMMENDED` | GET | `/notifications` | In-app notification list |
| `DEMO_1_RECOMMENDED` | PATCH | `/notifications/:id/read` | Mark notification as read |
| `FUTURE` | POST | `/expenses` | Manual one-off expense entry |
| `FUTURE` | POST | `/receipts/upload` | Receipt upload and OCR |
| `FUTURE` | POST | `/analytics/spending-analysis` | AI spending analysis |
| `FUTURE` | GET | `/insights` | AI and rule-based insights |
| `FUTURE` | POST | `/quiz/sessions` | Financial literacy quiz |
| `FUTURE` | POST | `/friends/requests` | Friend request |
| `FUTURE` | POST | `/challenges` | Create challenge |
| `FUTURE` | GET | `/wrapped/:year/:month` | Monthly Wrapped summary |

---
## 6. Endpoint Contracts

### GET /api/v1/health
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Public
Confirms the backend is running and can reach its dependencies. The overall status may be `degraded` if the AI service is unavailable while the core API is functional.
**Response 200:**
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2026-05-18T08:00:00.000Z",
    "version": "1.0.0",
    "services": { "database": "up", "ai": "up" }
  }
}
```
Never expose secrets or internal connection strings in this response.
### GET /api/v1/users/me
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Returns the current application-level user. On the first authenticated request from a Supabase identity, bootstraps all default user state in a single transaction.
**Bootstrap creates (transactionally):** `User`, `UserPreference`, `NotificationPreference`, `CreditProfile`, `GamificationProfile`, `UserEvent: USER_BOOTSTRAPPED.
**Response 200:**
```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "student@example.com",
      "displayName": "Kyle",
      "avatarUrl": null,
      "onboardingCompleted": false,
      "createdAt": "2026-05-18T08:00:00.000Z"
    },
    "preferences": {
      "theme": "SYSTEM",
      "currency": "ZAR",
      "language": "en",
      "reducedMotion": false
    },
    "notificationPreferences": {
      "inAppEnabled": true,
      "emailEnabled": false,
      "pushEnabled": false,
      "smsEnabled": false,
      "defaultReminderDaysBefore": 3
    },
    "creditProfile": {
      "currentScore": 650,
      "previousScore": 650,
      "scoreTier": "EXCELLENT"
    },
    "gamificationProfile": {
      "coinBalance": 0,
      "xp": 0,
      "mascotLevel": 1,
      "mascotMood": "NEUTRAL",
      "currentPaymentStreak": 0,
      "longestPaymentStreak": 0
    }
  }
}
```

| Status | Message |
|---|---|
| 401 | Unauthorised |
| 500 | Could not initialise user profile |---### `PATCH /api/v1/users/me
**Status:** `DEMO_1_RECOMMENDED` 
**Auth:** Required
Updates safe profile fields. The backend must reject attempts to update `id`, `supabaseAuthId`, `email`, score fields, or gamification fields through this endpoint.
**Request body:**
```json
{ "displayName": "Kyle M", "avatarUrl": "https://...", "onboardingCompleted": true }
```

| Field | Validation |
|---|---|
| `displayName` | optional string, 1–80 chars |
| `avatarUrl` | optional URL or null |
| `onboardingCompleted` | optional boolean |
### GET /api/v1/categories
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Returns seeded categories used to populate obligation and expense forms.
**Query params:** `?type=OBLIGATION` | `EXPENSE` | `ALL` (default `ALL`).
**Response 200:**
```json
{
  "data": [
    { "id": "cat_rent", "name": "Rent", "type": "OBLIGATION", "iconKey": "home", "colourKey": "blue", "isDefault": true },
    { "id": "cat_subs", "name": "Subscriptions", "type": "OBLIGATION", "iconKey": "repeat", "colourKey": "purple", "isDefault": true }
  ]
}
```
---
### POST /api/v1/obligations
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Creates a financial obligation with its schedule, payment occurrences, reminders, and a user event. Must execute in a single Prisma transaction.
**Request body:**
```json
{
  "name": "Netflix",
  "description": "Monthly streaming subscription",
  "type": "SUBSCRIPTION",
  "categoryId": "cat_subs",
  "amount": 199.00,
  "currency": "ZAR",
  "priority": "MEDIUM",
  "startDate": "2026-05-01",
  "endDate": null,
  "schedule": {
    "frequency": "MONTHLY",
    "interval": 1,
    "dayOfMonth": 1,
    "totalOccurrences": null
  },
  "reminders": {
    "enabled": true,
    "daysBefore": [3, 1],
    "channels": ["IN_APP"]
  }
}
```

| Field | Required | Validation |
|---|---|---|
| `name` | yes | string, 1–120 chars |
| `type` | yes | `ObligationType` enum |
| `categoryId` | yes | must exist |
| `amount` | yes | decimal > 0 |
| `currency` | yes | default `ZAR` |
| `startDate` | yes | ISO date |
| `endDate` | no | ISO date after `startDate`, or null |
| `schedule.frequency` | yes | `PaymentFrequency` enum |
| `schedule.totalOccurrences` | conditional | required for `FIXED_INSTALLMENTS` |
**Transaction steps:**
1. Validate category exists.
2. Create `FinancialObligation.`
3. Create `PaymentSchedule`.
4. Generate `PaymentOccurrence` rows,  next 3–6 months for recurring, all for fixed instalment.
5. Create `Reminder` rows if enabled
6. Create `UserEvent: OBLIGATION_CREATED
**Response 201:**
```json
{
  "data": {
    "obligation": { "id": "obl_123", "name": "Netflix", "status": "ACTIVE", "amount": 199.00 },
    "schedule": { "id": "sch_123", "frequency": "MONTHLY", "interval": 1, "dayOfMonth": 1 },
    "generatedOccurrences": [
      { "id": "occ_001", "dueDate": "2026-06-01", "amountDue": 199.00, "status": "PENDING", "sequenceNumber": 1 },
      { "id": "occ_002", "dueDate": "2026-07-01", "amountDue": 199.00, "status": "PENDING", "sequenceNumber": 2 }
    ],
    "createdReminders": [
      { "id": "rem_001", "occurrenceId": "occ_001", "channel": "IN_APP", "scheduledFor": "2026-05-29T08:00:00.000Z" }
    ],
    "event": { "type": "OBLIGATION_CREATED" }
  }
}
```

| Status | Message |
|---|---|
| 400 | Amount must be greater than zero |
| 400 | End date must be after start date |
| 400 | Total occurrences is required for fixed instalments |
| 404 | Category not found |---### `GET /api/v1/obligations
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Lists the user's obligations. Only returns records owned by the authenticated user where `deletedAt` is null.
**Query params:** 
`?status=ACTIVE&type=SUBSCRIPTION&categoryId=&dueSoon=true&page=1&perPage=20
**Response 200:**
```json
{
  "data": [
    {
      "id": "obl_123",
      "name": "Netflix",
      "type": "SUBSCRIPTION",
      "status": "ACTIVE",
      "amount": 199.00,
      "currency": "ZAR",
      "priority": "MEDIUM",
      "category": { "id": "cat_subs", "name": "Subscriptions", "iconKey": "repeat" },
      "nextOccurrence": { "id": "occ_001", "dueDate": "2026-06-01", "status": "PENDING", "amountDue": 199.00 }
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1, "totalPages": 1 }
}
```
---
### GET /api/v1/obligations/:id
**Status:** `DEMO_1_RECOMMENDED` 
**Auth:** Required
Returns one obligation with schedule, upcoming occurrences, recent payment records, and reminders.

| Status | Message |
|---|---|
| 404 | Financial obligation not found |

---
### PATCH /api/v1/obligations/:id
**Status:** `DEMO_1_RECOMMENDED`
**Auth:** Required
Updates obligation fields. If schedule-impacting fields change, set `"regenerateFutureOccurrences": true` to cancel unpaid future occurrences and regenerate.
**Business rules:** Past paid occurrences must not be edited. Score history must not be erased.

---
### DELETE /api/v1/obligations/:id
**Status:** `DEMO_1_RECOMMENDED` 
**Auth:** Required
Soft-deletes the obligation by setting `deletedAt`. Future unpaid occurrences are cancelled. Past payment records and score events are preserved.
**Response 200:**
```json
{ "data": { "id": "obl_123", "status": "ARCHIVED", "deletedAt": "2026-05-18T09:00:00.000Z", "futureOccurrencesCancelled": 3 } }
```
---
### GET /api/v1/payment-occurrences/upcoming
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Returns the user's expected payments for calendar and timeline views, sorted by `dueDate` ascending.
**Query params:** `?from=2026-05-18&to=2026-06-30&status=PENDING,OVERDUE&page=1&perPage=20`
Defaults: `from` = today, `to` = 30 days from today, `status` = `PENDING,OVERDUE
**Response 200:**
```json
{
  "data": [
    {
      "id": "occ_001",
      "dueDate": "2026-06-01",
      "amountDue": 199.00,
      "currency": "ZAR",
      "status": "PENDING",
      "sequenceNumber": 1,
      "daysUntilDue": 14,
      "obligation": { "id": "obl_123", "name": "Netflix", "type": "SUBSCRIPTION", "priority": "MEDIUM" },
      "reminders": [{ "id": "rem_001", "scheduledFor": "2026-05-29T08:00:00.000Z", "channel": "IN_APP" }]
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1, "totalPages": 1 }
}
```
---
### GET /api/v1/payment-occurrences/:id
**Status:** `DEMO_1_RECOMMENDED
Auth:** Required
Returns a single occurrence with its parent obligation, payment record if paid, and a score risk estimate.

---
### POST /api/v1/payments/log
**Status:** `DEMO_1_REQUIRED`
Auth:** Required
The most consequential Demo 1 endpoint. Logs a payment and triggers all downstream updates in a single transaction.
**Request body:**
```json
{
  "occurrenceId": "occ_001",
  "amountPaid": 199.00,
  "paidDate": "2026-06-01",
  "notes": "Paid from Capitec app"
}
```

| Field | Required | Validation |
|---|---|---|
| `occurrenceId` | yes | must exist and belong to authenticated user |
| `amountPaid` | yes | decimal > 0 |
| `paidDate` | yes | ISO date |
| `notes` | no | max 500 chars |
**Transaction steps:**
1. Load occurrence and verify ownership.
2. Verify occurrence is payable (not already paid, not cancelled).
3. Compare `paidDate` to `dueDate` -> `ON_TIME` or `LATE`.
4. Calculate `daysLate` and `simulatedInterest` if late.
5. Create `PaymentRecord`.
6. Update `PaymentOccurrence.status` -> `PAID` or `PAID_LATE.`
7. Create `ScoreEvent` (on-time: +8pts, late: −8pts).
8. Update `CreditProfile.`
9. Create `UserEvent.`
10. Update `GamificationProfile` (on-time: +coins, +XP, increment streak, mood `HAPPY`; late: reset streak, mood `STRESSED`).
11. Create `RewardTransaction` if coins/XP awarded.
12. Check and award `UserBadge` progress.
13. Create `Notification.
**Response 201 (on-time payment):**
```json
{
  "data": {
    "paymentRecord": {
      "id": "pay_123", "occurrenceId": "occ_001", "amountPaid": 199.00,
      "paidDate": "2026-06-01", "paymentStatus": "ON_TIME", "daysLate": 0, "simulatedInterest": 0.00
    },
    "occurrence": { "id": "occ_001", "status": "PAID", "paidAt": "2026-06-01T10:00:00.000Z" },
    "scoreUpdate": {
      "scoreBefore": 660, "scoreAfter": 668, "pointsDelta": 8,
      "scoreTier": "EXCELLENT", "explanation": "+8 points: Netflix paid on time."
    },
    "gamificationUpdate": {
      "coinsAwarded": 15, "xpAwarded": 10, "currentPaymentStreak": 4,
      "mascotMood": "HAPPY", "badgeUnlocked": { "code": "FIRST_ON_TIME_PAYMENT", "name": "First On-Time Payment" }
    },
    "notifications": [{ "id": "not_123", "type": "PAYMENT_LOGGED", "title": "Payment logged", "message": "Netflix was paid on time and your score improved." }]
  }
}
```
**Response 201 (late payment):**
```json
{
  "data": {
    "paymentRecord": {
      "id": "pay_456", "amountPaid": 450.00, "paidDate": "2026-06-05",
      "paymentStatus": "LATE", "daysLate": 4, "simulatedInterest": 2.96
    },
    "occurrence": { "id": "occ_002", "status": "PAID_LATE" },
    "scoreUpdate": {
      "scoreBefore": 660, "scoreAfter": 652, "pointsDelta": -8,
      "explanation": "-8 points: Utility bill was paid 4 days late."
    },
    "gamificationUpdate": { "coinsAwarded": 0, "xpAwarded": 0, "currentPaymentStreak": 0, "mascotMood": "STRESSED", "badgeUnlocked": null }
  }
}
```
Score and reward point values must live in a central constants/config file, not hardcoded in the controller.

| Status | Message |
|---|---|
| 400 | Payment amount must be greater than zero |
| 400 | Payment occurrence has already been paid |
| 400 | Paid date cannot be before the obligation start date |
| 404 | Payment occurrence not found |

---
### GET /api/v1/payments
**Status:** `DEMO_1_RECOMMENDED`
**Auth:** Required
Returns the user's payment history. 
Supports `?from=&to=&status=ON_TIME|LATE&obligationId=&page=&perPage=`.

---
### GET /api/v1/credit-profile
**Status:** `DEMO_1_REQUIRED`
**Auth:** Required
Returns the current simulated financial health score. Label this as simulated in frontend copy.
**Response 200:**
```json
{
  "data": {
    "currentScore": 668,
    "previousScore": 660,
    "scoreTier": "EXCELLENT",
    "onTimePaymentCount": 7,
    "latePaymentCount": 1,
    "missedPaymentCount": 0,
    "lastCalculatedAt": "2026-06-01T10:00:00.000Z",
    "scoreRange": { "min": 0, "max": 850 }
  }
}
```
---
### GET /api/v1/credit-profile/events
**Status:** `DEMO_1_REQUIRED`
**Auth:** Required
Returns the append-only score explanation history, sorted newest first.
**Response 200:**
```json
{
  "data": [
    {
      "id": "se_123",
      "eventType": "PAYMENT_ON_TIME",
      "pointsDelta": 8,
      "scoreBefore": 660,
      "scoreAfter": 668,
      "explanation": "+8 points: Netflix paid on time.",
      "calculationMetadata": { "obligationName": "Netflix", "daysLate": 0, "amount": 199.00 },
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1, "totalPages": 1 }
}
```
---
### GET /api/v1/gamification/profile
**Status:** `DEMO_1_REQUIRED` 
**Auth:** Required
Returns the current gamification state. Read-only,  reward calculation happens inside `POST /payments/log`, not here.
**Response 200:**
```json
{
  "data": {
    "coinBalance": 145,
    "xp": 320,
    "mascotLevel": 2,
    "mascotMood": "HAPPY",
    "currentPaymentStreak": 4,
    "longestPaymentStreak": 6,
    "currentKnowledgeStreak": 0,
    "longestKnowledgeStreak": 0,
    "updatedAt": "2026-06-01T10:00:00.000Z"
  }
}
```
---
### GET /api/v1/gamification/rewards
**Status:** `DEMO_1_RECOMMENDED`
**Auth:** Required
Returns the coin and XP transaction history.
**Response 200:**
```json
{
  "data": [
    { "id": "rt_123", "type": "EARNED", "amount": 15, "balanceAfter": 145, "reason": "On-time payment: Netflix", "createdAt": "2026-06-01T10:00:00.000Z" }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1, "totalPages": 1 }
}
```
---
### GET /api/v1/gamification/badges
**Status:** `DEMO_1_RECOMMENDED` · **Auth:** Required
Returns all badges with earned/locked state and progress.
**Response 200:**
```json
{
  "data": [
    {
      "code": "FIRST_ON_TIME_PAYMENT", "name": "First On-Time Payment",
      "description": "Log your first payment on or before its due date.",
      "category": "PAYMENTS", "iconKey": "sparkle",
      "isEarned": true, "progress": 1, "criteriaValue": 1, "earnedAt": "2026-06-01T10:00:00.000Z"
    },
    {
      "code": "THREE_PAYMENT_STREAK", "name": "Reliable Payer",
      "description": "Make three on-time payments in a row.",
      "category": "STREAKS", "iconKey": "flame",
      "isEarned": false, "progress": 2, "criteriaValue": 3, "earnedAt": null
    }
  ]
}
```
---
### GET /api/v1/dashboard
**Status:** `DEMO_1_REQUIRED` · **Auth:** Required
Aggregates all data needed to render the home screen in a single call. Must work even if the AI service is unavailable.
**Response 200:**
```json
{
  "data": {
    "user": { "displayName": "Kyle" },
    "creditProfile": { "currentScore": 668, "previousScore": 660, "scoreTier": "EXCELLENT", "lastDelta": 8 },
    "gamificationProfile": { "coinBalance": 145, "xp": 320, "mascotMood": "HAPPY", "currentPaymentStreak": 4 },
    "paymentSummary": {
      "upcomingCount": 3, "overdueCount": 0, "monthlyDueTotal": 2499.00,
      "nextPayment": { "id": "occ_001", "name": "Netflix", "dueDate": "2026-06-01", "amountDue": 199.00, "status": "PENDING" }
    },
    "upcomingPayments": [
      { "id": "occ_001", "name": "Netflix", "dueDate": "2026-06-01", "amountDue": 199.00, "status": "PENDING" }
    ],
    "recentScoreEvents": [
      { "id": "se_123", "pointsDelta": 8, "explanation": "+8 points: Netflix paid on time.", "createdAt": "2026-06-01T10:00:00.000Z" }
    ],
    "recentBadges": [
      { "code": "FIRST_ON_TIME_PAYMENT", "name": "First On-Time Payment", "earnedAt": "2026-06-01T10:00:00.000Z" }
    ],
    "notifications": [
      { "id": "not_123", "type": "PAYMENT_LOGGED", "title": "Payment logged", "message": "Netflix was paid on time.", "readAt": null }
    ]
  }
}
```
---
### GET /api/v1/notifications
**Status:** `DEMO_1_RECOMMENDED`
**Auth:** Required
Lists the user's in-app notifications. Supports `?unreadOnly=false&page=1&perPage=20`.

---
### PATCH /api/v1/notifications/:id/read
**Status:** `DEMO_1_RECOMMENDED`
**Auth:** Required
Marks a notification as read. Requires ownership check. Returns the updated notification.

---
## 7. Future Endpoints (Documented for Architecture)
These are not required for Demo 1 but are documented to show how the system grows.

| Group              | Endpoints                                                                          |
| ------------------ | ---------------------------------------------------------------------------------- |
| Manual expenses    | `POST /expenses`, `GET /expenses`, `PATCH /expenses/:id`, `DELETE /expenses/:id`   |
| Receipt OCR        | `POST /receipts/upload`, `GET /receipts/:id`                                       |
| AI insights        | `POST /analytics/spending-analysis`, `GET /insights`, `POST /insights/:id/dismiss` |
| Financial literacy | `GET /quiz/questions`, `POST /quiz/sessions`, `PATCH /quiz/sessions/:id/submit`    |
| Social             | `POST /friends/requests`, `GET /friends`, `POST /challenges`, `GET /challenges`    |
| Cosmetics          | `GET /inventory/cosmetics`, `PATCH /inventory/cosmetics/:id/equip`                 |
| Monthly Wrapped    | `GET /wrapped/:year/:month`, `GET /wrapped/history`                                |

---
## 8. Error Catalogue

| Status | Message | Typical endpoint |
|---|---|---|
| 400 | Amount must be greater than zero | obligations, payments |
| 400 | End date must be after start date | obligations |
| 400 | Payment occurrence has already been paid | payments/log |
| 400 | Total occurrences is required for fixed instalments | obligations |
| 401 | Unauthorised | all protected endpoints |
| 404 | Financial obligation not found | obligations/:id |
| 404 | Payment occurrence not found | payment-occurrences/:id, payments/log |
| 503 | AI service is temporarily unavailable | analytics, insights |
Error messages must be sentence case and user-readable. Do not expose raw enum codes, stack traces, or Prisma error messages.

---
## 9. Contract Stability Rules
Once frontend integration begins:
1. Do not rename endpoint paths without team agreement.
2. Do not remove response fields already consumed by the frontend.
3. Add new optional fields rather than changing existing field meanings.
4. Keep enum names stable and consistent with Prisma schema.
5. Any endpoint that mutates money, dates, score, streaks, or rewards must have automated tests.
6. Update Swagger decorators, DTOs, frontend types, and this document in the same PR as any endpoint change.