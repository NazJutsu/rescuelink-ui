# RescueLink — API Implementation Plan

**Decision (locked):** Backend = **Firebase Cloud Functions**, living in **this repo** as a monorepo package (`functions/`).
**Why:** The app already talks to Firebase directly (Auth + Firestore with security rules). We only move logic server-side where the client *cannot* be trusted — money, notifications, cross-user writes, and verification. Reads and realtime tracking stay client-direct so we keep `onSnapshot` live updates for free and avoid rewriting a data layer that already works.

This document is a **plan only** — no backend code has been written.

---

## 1. Guiding principle — what is "the API"

There are two server surfaces, and we use each for what it's good at:

| Surface | Used for | Trust model |
|---|---|---|
| **Client-direct Firestore** (exists) | Reads, realtime subscriptions, owner-scoped writes (profile, onboarding draft, live location) | Firestore Security Rules |
| **Cloud Functions** (to build) | Anything involving money, push, cross-user state changes, or external secrets | Server-side; client cannot forge |

**Rule of thumb:** if a malicious client could cause damage by calling it directly (set a job to `paid`, approve themselves, charge a card, write to another user's doc), it belongs in a Function. Otherwise leave it client-direct.

Two Function invocation styles:
- **Callable functions** (`onCall`) — request/response, called from the app with the user's auth context attached. Used for actions: confirm booking, accept job, complete job.
- **Trigger functions** (`onDocumentWritten`, Stripe webhooks) — react to data/events. Used for side effects: send push when status changes, payout when job completes, notify on approval.

---

## 2. Monorepo structure (to add)

The app is being restructured to a **production-grade, feature-first layout** in parallel with this backend work (see `STRUCTURE.md` for the full refactor guide). The target tree below reflects that — the Cloud Functions backend slots in alongside it. The two efforts are complementary: the refactor extracts a pure `domain/pricing` module on the client, which is the same code that gets ported into `functions/` (the single source of truth for the fare engine).

```
rescuelink-ui/
├── src/                          ← Expo app (feature-first — see STRUCTURE.md)
│   ├── app/                      ← shell: providers, ErrorBoundary, navigation
│   ├── features/                 ← auth · booking · tracking · jobs · operator · vehicles
│   ├── shared/                   ← ui/ (design system) · hooks · utils · types
│   ├── services/                 ← infra clients
│   │   ├── firebase/             ← config, auth, user, job, storage (client SDK)
│   │   ├── location/             ← geocoding, routing, places
│   │   └── weather/              ← openMeteo
│   ├── domain/                   ← pure business logic: pricing, operator-eligibility
│   ├── config/                   ← env, constants, feature flags
│   ├── store/                    ← state, split by domain
│   └── mocks/                    ← seed data, deletable once backend is live
├── functions/                    ← NEW — Cloud Functions backend
│   ├── src/
│   │   ├── index.ts              ← exports all functions
│   │   ├── jobs.ts               ← requestJob, acceptJob, status transitions, matching
│   │   ├── pricing.ts            ← fare engine (port of src/domain/pricing) + getQuote
│   │   ├── payments.ts           ← Stripe PaymentIntent, webhook handler
│   │   ├── payouts.ts            ← Stripe Connect onboarding + transfers
│   │   ├── drivers.ts            ← operator approval trigger
│   │   ├── notifications.ts      ← FCM push helpers
│   │   └── lib/
│   │       ├── shared-types.ts   ← re-exports from ../../src/shared/types (single source of truth)
│   │       ├── auth.ts           ← assertAuthed / assertRole helpers
│   │       └── stripe.ts         ← Stripe client init
│   ├── package.json              ← separate deps (firebase-admin, stripe); own node engine
│   └── tsconfig.json
├── firebase/firestore.rules      ← tighten (see §7)
├── firestore.indexes.json        ← add composite indexes (see §7)
└── firebase.json                 ← add "functions" block
```

**Shared types:** `functions/` imports the client's shared domain types (`src/shared/types`) so client and server never drift. (Either a path alias in `functions/tsconfig.json` or a thin re-export file. The Functions deploy bundles its own copy — no runtime coupling, just compile-time type sharing.)

**Shared pricing:** the fare math lives once in `src/domain/pricing` as a pure function (`priceQuote(inputs, rateCard) → breakdown`); `functions/src/pricing.ts` re-uses that same logic. The client uses it for display estimates only; the server's result is binding (see §4).

---

## 3. UI feature → API mapping

This is the core of the plan: every backend-dependent UI feature, what backs it, and whether it's a Function or stays client-direct.

### 3.1 Auth & roles
- **UI:** `LoginScreen`, `RegisterScreen`, role chosen at register.
- **Status:** Auth is done (client SDK). `users/{uid}` + `operators/{uid}` docs created client-side.
- **Gap:** Role currently lives only in the Firestore doc. Security rules can't cheaply read another collection to authorize cross-user actions (e.g. "is this caller an operator?").
- **Plan:** Add a Function `onUserDocCreated` (trigger on `users/{uid}` create) that sets a **custom auth claim** `{ role: "customer" | "operator" }`. Rules and Functions then check `request.auth.token.role` directly. App refreshes its token after register to pick up the claim.

### 3.2 Driver onboarding & document uploads
- **UI:** `OperatorOnboardingScreen` (6 steps), `storageService.uploadOperatorDoc`.
- **Status:** Firebase Storage upload already implemented; download URL stored on `operators/{uid}`.
- **Plan:**
  - **Storage Security Rules** (new file, not yet present) — only `operators/{uid}/**` writable by that uid, file size/type limits.
  - Onboarding draft writes stay **client-direct** (owner-scoped, low risk).
  - Submission for review = client sets `verificationStatus: "pending_review"` (allowed by rules), OR a callable `submitOperatorVerification` that server-validates required fields before flipping status (preferred — prevents incomplete submissions). **Recommend the callable** since the UI already has a `submitOperatorVerification` API method.

### 3.3 Driver approval / rejection
- **UI:** `OperatorPendingApprovalScreen`, `OperatorRejectedScreen`; today driven by dev-only `devApproveOperator` / `devRejectOperator`.
- **Must be server-side** (a driver must not approve themselves).
- **Plan:**
  - MVP: approval done manually in Firebase Console (flip `verificationStatus` to `approved`). Rules block clients from writing `verificationStatus` to `approved`/`rejected` themselves.
  - **Trigger `onOperatorStatusChange`** (`operators/{uid}` written): when status becomes `approved` or `rejected`, send FCM push ("You're approved!" / rejection reason). Later: a proper admin web tool replaces the Console step.

### 3.4 Customer booking — pickup/drop-off & location

- **UI:** `HomeMapScreen` collects the trip *before* booking:
  - **Pickup** — device GPS (`expo-location`) or typed address via **Photon** autocomplete (`photonSearch`), resolved to `{lat, lng, label}`.
  - **Drop-off** (optional) — typed address via Photon autocomplete → coords.
  - **Route/distance** — **OSRM** public demo server (`fetchOsrmDrivingRoute`) → `roadMiles` + ETA.
  - These are passed as **navigation params** into `BookingFlowScreen`, which prices locally (`buildMockQuote`).
- **Split — what stays on the client vs. moves server-side:**

  | Step | Where | Why |
  |---|---|---|
  | Address typeahead / autocomplete | Client-direct (proxy later) | Needs per-keystroke latency; low trust risk |
  | GPS pickup | Client | Device capability |
  | Map preview route line | Client | Cosmetic only |
  | Distance used for pricing | **Server** | Feeds money — client value can't be trusted |
  | Quote / total | **Server** | Money |
  | Service-area + input validation | **Server** | Trust |

- **Provider risk:** Photon (Komoot) and OSRM are **free public fair-use** servers — fine for the demo, but they will rate-limit / break under real traffic and offer no key or billing control. For production, move at least **routing** behind a Function using a keyed provider (Mapbox / Google / self-hosted OSRM). Optionally proxy geocoding too via `geocodeSearch` / `reverseGeocode` callables to hide keys and centralize rate limits — but keep client-direct first for typeahead UX.

### 3.4b Job request (the spine — highest priority)
- **UI:** `BookingFlowScreen` "Confirm & start tracking" → creates the job and navigates to `LiveTrackingScreen`.
- **Status:** `jobService.createJob` already writes `jobs/{jobId}` client-direct with `status: "requested"` **including `totalGbp`** — a modified client could book for £0.
- **Plan — two callables built on the Pricing Service (see §4):**
  1. **`getQuote(...)`** — called when the booking screen opens. Returns a **server-computed price + a stored `quoteId`** (the client *displays* this; it never computes it).
  2. **`requestJob({ quoteId, vehicleId, canMove, issue, description })`** — the booking sends back the **`quoteId`, not a price**. The Function loads the stored quote, validates it (unexpired, matches this user/trip), and writes the job with the server's `totalGbp` + `status: "requested"`, returns `jobId`.
  - `LiveTrackingScreen` then subscribes via existing `subscribeToJob` (`onSnapshot`) — **stays client-direct**.
- **The fare math itself lives in the Pricing Service (§4), not inline here.**

### 3.5 Driver job feed & accept
- **UI:** `OperatorHomeScreen` (open jobs), `OperatorJobsScreen`.
- **Status:** `subscribeToOpenJobs` (status == "requested") and `acceptJob` exist client-direct.
- **Plan:**
  - Feed (read of open jobs) **stays client-direct** via `onSnapshot`.
  - **Accept must be a callable `acceptJob`** to prevent races (two drivers accepting the same job) and to enforce "only approved operators can accept." The Function runs a **Firestore transaction**: re-read job, fail if already has `driverId`, else set `driverId`/`driverName`/`status: "en_route"`. Current rules allow a client claim but can't do an atomic check-and-set safely across the matching policy.
  - **Matching (Phase 2):** geo-filter open jobs to nearby drivers; for MVP show all open jobs (as planned).

### 3.6 Live location tracking
- **UI:** `OperatorLiveJobScreen` (driver broadcasts), `LiveTrackingScreen` (customer watches).
- **Plan — stays client-direct, no Function needed:**
  - Driver writes `driverLat`/`driverLng` to the active `jobs/{jobId}` every few seconds (`updateDriverLocation` exists). Rules already allow the assigned `driverId` to update.
  - Customer's `subscribeToJob` `onSnapshot` picks up moves automatically.
  - **Cost note:** per-second writes get expensive; throttle to ~5s and only while job is active. Document the tradeoff (Firestore writes vs. RTDB) — RTDB is cheaper for high-frequency ephemeral location if this becomes a cost issue.

### 3.7 Job status transitions (arrived / completed / cancelled)
- **UI:** `OperatorLiveJobScreen` actions, customer cancel.
- **Plan — callable `updateJobStatus`** rather than raw client `updateDoc`, because completion triggers payment capture and payout. Server enforces the legal state machine (`en_route → arrived → completed`; either party `→ cancelled` under rules). `completed` is what kicks off §3.9.

### 3.8 Payments (customer charge)
- **UI:** add a Stripe Payment Sheet step in `BookingFlowScreen`.
- **All server-side** (secret keys, money).
- **Plan:**
  - **Callable `createPaymentIntent(jobId)`** — verifies caller owns the job, creates a Stripe PaymentIntent for the server-computed total, returns `client_secret`. App presents `@stripe/stripe-react-native` Payment Sheet.
  - **Webhook `stripeWebhook`** (HTTP function) — on `payment_intent.succeeded`, set `jobs/{jobId}.paymentStatus = "paid"`. Webhook signature verified with Stripe signing secret. (Never trust the client to mark paid.)
  - **New field:** add `paymentStatus: "unpaid" | "authorized" | "paid" | "refunded"` to `JobDoc` and the `JobStatus`/job types.

### 3.9 Payouts (driver, Stripe Connect)
- **UI:** onboarding payout step (currently mock bank fields), `OperatorEarningsScreen`.
- **All server-side.**
- **Plan:**
  - **Callable `createConnectOnboardingLink`** — generates a Stripe Connect Express onboarding URL; replaces the mock sort-code/account fields. Store `stripeAccountId` on `operators/{uid}`.
  - **Trigger on job `completed`** (inside `updateJobStatus` flow or a dedicated trigger): capture the customer charge, transfer the driver's cut (e.g. 80%) to their Connect account, retain platform fee (20%). Write a payout record (`jobs/{jobId}.payout` or a `payouts/` collection that `OperatorEarningsScreen` reads).

### 3.10 Push notifications (FCM)
- **All server-side** (triggered by data changes).
- **Plan:** `notifications.ts` helper + token registration:
  - App registers its FCM/Expo push token → store on `users/{uid}.pushTokens[]`.
  - Triggers fan out per the event table below.

| Event | Trigger source | Recipient |
|---|---|---|
| New job posted nearby | `requestJob` / `jobs` create | Nearby available drivers |
| Driver accepted | `acceptJob` status→`en_route` | Customer |
| Driver arrived | status→`arrived` | Customer |
| Job completed (+receipt) | status→`completed` | Customer |
| Onboarding approved/rejected | `operators` status change (§3.3) | Driver |

---

## 4. Pricing service (the fare engine)

This is the corrected design. **Pricing is not "the client calculates and the server double-checks." Pricing is its own dedicated server-side service — the *only* thing that ever produces a price — and the client merely displays what it returns.** This mirrors how the industry does it: ride-hailing and roadside platforms run pricing as an independent service that fronts mapping + demand data and emits an authoritative fare, and they use a **stored/"upfront" quote** so the price shown before booking is the price charged after. (Uber upfront pricing; airline "stored fare"; towing = base hook-up fee + per-mile + vehicle/service modifiers + surcharges.)

### 4.1 Why a separate service (not inline in `requestJob`)
- **Single source of truth.** One module owns the formula; `getQuote`, `requestJob`, payment capture, and any future web/admin client all call it. No drift, no duplicated math (today the formula lives on the client in `quote.ts` — that moves *out*).
- **Config-driven, not hardcoded.** Rates live in a **`pricingConfig` document in Firestore (a "rate card")**, not in code — so ops can change the base fee, per-mile rate, or surge without a redeploy. `quote.ts`'s hardcoded `£45 / £3.20 / 20%` become config values.
- **Testable & auditable.** A pure function `priceQuote(inputs, rateCard) → breakdown` is unit-testable in isolation (the existing `quote.test.ts` is a starting point) and every quote is stored, so any charge can be traced back to the exact inputs and rates that produced it.

### 4.2 The quote lifecycle (anti-tampering pattern)
```
1. Booking screen opens
   → app calls getQuote({ pickup, dropoff?, vehicleClass, canMove, issue, when })
2. Pricing Service:
   a. server-side routing (keyed provider) → trusted distanceMiles, onMotorway, ETA
   b. load active rate card from pricingConfig
   c. compute breakdown (base + distance + modifiers + surge + VAT)
   d. WRITE the quote to quotes/{quoteId}: { inputs, breakdown, total, userId,
                                             createdAt, expiresAt (~10 min) }
   e. return { quoteId, breakdown, total } to the app
3. App DISPLAYS breakdown/total (read-only) — it does no math
4. Customer confirms → requestJob({ quoteId, ... })
5. Pricing/Jobs Service: load quotes/{quoteId}, assert not expired,
   assert it belongs to this user → copy its total into jobs/{jobId}
6. Payment (§3.8) charges the SAME stored total — never a client-supplied number
```
The `quoteId` is the binding reference. A tampered client can change what it *shows*, but it can only book against a real, server-stored quote, and the charge always comes from that stored record. (Alternative to a `quotes` collection: a signed JWT quote token with the breakdown in the claims + short expiry — same guarantee, no Firestore read. Recommend the stored-quote collection for MVP: simpler, auditable, and lets us refund/inspect.)

### 4.3 Fare model (roadside-recovery shaped, industry-standard inputs)
Port and generalize `quote.ts` into the service. Components, all sourced from the rate card:

| Component | Driver of cost | Notes |
|---|---|---|
| **Base call-out / hook-up fee** | `canMove` (rolling tow vs. flatbed/lift) | Today `£45 / £65`. Industry analog: base hook-up fee. |
| **Distance** | server-routed `distanceMiles × perMileRate` | Today `£3.20/mi`. Per-mile is the core towing rate. |
| **Vehicle-class modifier** | vehicle weight/type (car/SUV/van/EV) | New — industry standard; heavier = higher per-mile. |
| **Service modifiers** | winch/recovery, flatbed required | Maps to `recoveryFlatbed`/`recoveryWinch` capabilities. |
| **Surge / time multiplier** | demand-vs-supply, after-hours, weather | MVP: multiplier defaults to `1.0` with hooks; see §4.4. |
| **VAT** | statutory | Today 20%; keep in rate card. |

### 4.4 Dynamic pricing (designed-for, phased-in)
Industry surge = real-time demand/supply by geographic cell (Uber uses H3 hexagons; raises price where demand outstrips available drivers, and for after-hours/weather). For RescueLink:
- **MVP:** `surgeMultiplier = 1.0`. The breakdown already carries the field so turning it on later is not a schema change.
- **Phase 2+:** a `getSurge(area, time)` input derived from open-jobs-vs-available-operators in the pickup's geo-cell, plus an **after-hours/weather** surcharge (the app already integrates Open-Meteo — weather can feed this). Keep the multiplier **capped and logged** for fairness/regulatory reasons.

### 4.5 What this changes in the codebase
- `src/data/quote.ts` → logic moves to `functions/src/pricing.ts`; client keeps only types and the read-only display.
- New `quotes/{quoteId}` collection (server-write only) and `pricingConfig` rate-card doc (server-read; admin-write only).
- New callables: **`getQuote`** and the pricing core consumed by **`requestJob`** and payment capture.

### 4.6 Concrete schemas (build against these)

All money is **integer pence** (`Gbp` suffix = pence), not floats — avoids rounding drift across quote → job → Stripe (Stripe also charges in the smallest currency unit). Convert to `£x.xx` only for display. (Note: the current client `QuoteBreakdown` uses pounds as floats — the server contract switches to pence.)

**A. Rate card — `pricingConfig/current` (single doc; server-read, admin-write only)**
```ts
type VehicleClass = "car" | "suv" | "van" | "ev" | "motorcycle";

type RateCard = {
  version: number;                 // bump on every change; copied onto each quote
  currency: "GBP";
  vatRatePct: number;              // e.g. 20
  // Base call-out by movability (rolling tow vs. flatbed/lift)
  baseCallout: { rollingGbp: number; liftGbp: number };   // e.g. 4500 / 6500
  perMileGbp: number;              // e.g. 320  (£3.20/mi)
  // Multiplier applied to the per-mile leg, by vehicle class
  vehicleClassMultiplier: Record<VehicleClass, number>;   // car:1.0, suv:1.15, van:1.3, ev:1.1, motorcycle:0.9
  // Flat add-ons for special service needs
  serviceFees: { winchGbp: number; flatbedGbp: number; motorwaySurchargeGbp: number };
  // Surge — MVP fixed at 1.0; later driven by demand/time/weather (see §4.4)
  surge: { multiplier: number; cap: number };             // multiplier:1.0, cap:2.0
  // Minimum chargeable distance + sanity ceiling for service area
  minMiles: number;                // e.g. 1
  maxServiceMiles: number;         // reject quotes beyond this
  quoteTtlSeconds: number;         // e.g. 600 (10 min)
  updatedAt: string;               // ISO
};
```

**B. Quote breakdown (server-computed; returned to client AND stored)**
```ts
type QuoteBreakdownV2 = {
  baseCalloutGbp: number;          // from baseCallout.rolling|lift
  distanceMiles: number;           // server-routed, trusted
  perMileGbp: number;              // rate used
  vehicleClass: VehicleClass;
  vehicleMultiplier: number;       // applied to the distance leg
  distanceGbp: number;             // round(distanceMiles * perMileGbp * vehicleMultiplier)
  winchGbp: number;
  flatbedGbp: number;
  motorwaySurchargeGbp: number;
  surgeMultiplier: number;         // 1.0 at MVP
  surgeGbp: number;                // surcharge from surge (0 at MVP)
  subtotalGbp: number;
  vatGbp: number;
  totalGbp: number;                // the single binding number
};
```

**C. Stored quote — `quotes/{quoteId}` (server-write only)**
```ts
type QuoteDoc = {
  id: string;
  userId: string;                  // owner — requestJob asserts caller === userId
  rateCardVersion: number;         // which rates produced this
  inputs: {                        // echo of what was priced, for audit
    pickup:  { lat: number; lng: number; label: string };
    dropoff?:{ lat: number; lng: number; label: string };
    vehicleId: string;
    vehicleClass: VehicleClass;
    canMove: boolean;              // rolling tow vs. lift
    issue: string;
    requestedAt: string;           // ISO — basis for any time-of-day surge
  };
  breakdown: QuoteBreakdownV2;
  totalGbp: number;                // duplicated top-level for quick reads
  status: "active" | "consumed" | "expired";
  createdAt: string;               // ISO
  expiresAt: string;               // ISO = createdAt + quoteTtlSeconds
  consumedByJobId?: string;        // set when requestJob uses it (single-use)
};
```

**D. `getQuote` callable — request / response**
```ts
// request (from app)
type GetQuoteRequest = {
  pickup:  { lat: number; lng: number; label: string };
  dropoff?:{ lat: number; lng: number; label: string };
  vehicleId: string;               // server resolves class + EV from the user's vehicle doc
  canMove: boolean;
  issue: string;
};
// response (to app — display only)
type GetQuoteResponse = {
  quoteId: string;
  breakdown: QuoteBreakdownV2;
  totalGbp: number;
  expiresAt: string;               // app should re-quote past this
};
```
Server steps: resolve `vehicleClass` from `vehicles/{vehicleId}` → route pickup→dropoff (keyed provider) for trusted `distanceMiles` + `onMotorway` → load `pricingConfig/current` → `priceQuote(inputs, rateCard)` → write `quotes/{quoteId}` → return response. **Reject** if pickup outside service area or distance > `maxServiceMiles`.

**E. `requestJob` callable — request / response**
```ts
// request (from app) — carries the quoteId, NEVER a price
type RequestJobRequest = {
  quoteId: string;
  description?: string;            // free-text the operator should know
};
// response
type RequestJobResponse = { jobId: string };
```
Server steps (transaction): load `quotes/{quoteId}` → assert `status === "active"`, `expiresAt > now`, `userId === auth.uid` → create `jobs/{jobId}` copying `breakdown`/`totalGbp` from the quote + `status: "requested"` + `quoteId` + pickup/dropoff from quote inputs → mark quote `consumed` with `consumedByJobId`. Returns `jobId`.

**F. Job doc additions** (extend the existing `JobDoc` in `src/firebase/jobService.ts`)
```ts
// add to JobDoc:
quoteId: string;                   // provenance — which quote priced this job
rateCardVersion: number;
breakdown: QuoteBreakdownV2;       // frozen at request time
totalGbp: number;                  // already exists; now sourced from the quote, not the client
paymentStatus: "unpaid" | "authorized" | "paid" | "refunded";  // from §3.8
```

> **Pricing core signature** (pure, unit-testable — the heart of the engine):
> `priceQuote(inputs: QuoteDoc["inputs"], rate: RateCard): QuoteBreakdownV2`
> No I/O, no `Date.now()` — pass `requestedAt` in. This is what `getQuote` wraps after it has fetched routing + the rate card, and what the existing `quote.test.ts` should be ported to cover.

---

## 5. Functions inventory (summary)

| Function | Type | Phase | Purpose |
|---|---|---|---|
| `onUserDocCreated` | trigger | 1 | Set role custom claim |
| `submitOperatorVerification` | callable | 1 | Validate + flip to `pending_review` |
| `onOperatorStatusChange` | trigger | 1 | Push on approve/reject |
| `getQuote` | callable | 1 | Pricing Service — route, price, store quote, return quoteId |
| `requestJob` | callable | 1 | Validate quoteId, create job with stored total |
| `geocodeSearch` / `reverseGeocode` | callable | 2 (optional) | Proxy geocoding behind a keyed provider + rate limits |
| `routeEstimate` | callable | 2 (optional) | Keyed routing provider for distance/ETA (replaces OSRM demo) |
| `acceptJob` | callable | 1 | Atomic claim (transaction) |
| `updateJobStatus` | callable | 1–2 | Enforce state machine |
| `registerPushToken` | callable | 2 | Save FCM token |
| job-event push triggers | trigger | 2 | Notify on status changes |
| `createPaymentIntent` | callable | 3 | Stripe charge intent |
| `stripeWebhook` | HTTP | 3 | Mark paid on success |
| `createConnectOnboardingLink` | callable | 4 | Driver payout onboarding |
| payout-on-complete | trigger | 4 | Transfer driver cut + fee |

---

## 6. Client-side changes required

The app's `firebase/` service layer shifts some calls from direct Firestore writes to callable invocations:

- `jobService.createJob` → call `requestJob` callable (keep `subscribeToJob` as-is).
- `jobService.acceptJob` / `updateJobStatus` → call the callables.
- Replace dev approval buttons with the real pending/approved flow.
- Add `firebase/paymentsService.ts`, `firebase/pushService.ts`.
- `rescueLinkApi.ts` interface (`devApproveOperator`, etc.) trims its dev-only methods as real flows land.
- Add Stripe + FCM/Expo-notifications deps to the **app** `package.json`.

---

## 7. Security rules & indexes (must change)

**Rules — tighten beyond current state:**
- `jobs`: clients may **read** open/own jobs and **write live location** (assigned driver only), but **must not** set `totalGbp`, `paymentStatus`, `status` transitions that imply money — those become Function-only (use `firebase-admin`, which bypasses rules). Practically: lock down write paths the callables now own.
- `operators`: clients cannot set `verificationStatus` to `approved`/`rejected` or write `stripeAccountId`.
- `quotes`: **no client writes** (server-only via `getQuote`); a client may at most read its own quote. Prices must never be client-writable.
- `pricingConfig` (rate card): **server-read, admin-write only** — never writable by app clients.
- Add **Storage rules** (new) for `operators/{uid}/**`.

**Indexes (`firestore.indexes.json` — currently empty):**
- `jobs`: composite on `status` + `createdAt` (open-jobs feed, ordered).
- Phase 2 geo-matching may need `status` + geohash field.

---

## 8. Build order (MVP-first)

| Milestone | Contents | Outcome |
|---|---|---|
| **M0 — Scaffold** | `firebase init functions`, `functions/` package, shared-types wiring, emulator setup | Deployable empty backend, local emulator |
| **M1 — Pricing + core loop** | **Pricing Service** (`getQuote`, rate-card config, `quotes` collection), `requestJob` (quoteId), `acceptJob` (txn), `updateJobStatus`, role claims, tightened rules + indexes | Server-authoritative quote → request → accept → status flow |
| **M2 — Tracking & push** | Live-location throttling, `registerPushToken`, job-event push triggers, operator approval push | Realtime map + notifications on key events |
| **M3 — Payments** | `createPaymentIntent`, `stripeWebhook`, Payment Sheet in booking | Customer pays; job marked paid server-side |
| **M4 — Payouts** | Connect onboarding link, payout-on-complete transfer + platform fee | Driver gets paid; earnings screen real |
| **M5 — Hardening** | Validation, error handling, idempotency (webhooks/payouts), emulator tests, monitoring | Production-ready core |

**Immediate next step after this plan:** M0 scaffold + M1 Pricing Service (`getQuote`) and `requestJob` — pricing is the spine the booking, payment, and payout all attach to.

---

## 9. Open decisions to settle before M1

- **Stripe vs. alternative** for payments/payouts (plan assumes Stripe Connect Express).
- **Pricing model sign-off** — confirm the rate card: base hook-up fees, per-mile rate, vehicle-class bands, winch/recovery and after-hours surcharges, VAT, and whether dynamic surge is in scope for launch.
- **Quote storage** — `quotes` collection (auditable, recommended) vs. signed JWT quote token (no DB read). Plus quote TTL (default ~10 min).
- **Routing provider** for server-side distance (Mapbox / Google / self-hosted OSRM) — required by the Pricing Service; the OSRM/Photon demo servers are not production-safe.
- **Functions region** (deploy near `nam5` Firestore or near UK users — app is UK-oriented; consider `europe-west2`).
- **Admin approval tool**: Firebase Console for MVP, or build a minimal web admin in M2+?
- **Location store**: Firestore (simple, costs more) vs. Realtime Database (cheaper for high-frequency) — default Firestore for MVP.
- **Auth persistence**: app currently uses `inMemoryPersistence` (users re-login on restart) — out of scope for the API but worth fixing alongside.
