# RescueLink — MVP Implementation Guide & Checklist

**Purpose:** the single source of truth for *what to build and what is already done*. An AI agent or developer should update the checkboxes here as work lands, so status is always visible at a glance.

**Legend:** ✅ done · 🟡 partial (started / client-only / needs server) · ⬜ not started

**Companion docs:**
- `API_PLAN.md` — backend (Cloud Functions) design, pricing service, schemas
- `STRUCTURE.md` — project structure & refactor guide
- `AGENTS.md` — repo map & conventions for agents

> **How to use:** pick the lowest-numbered unchecked item in the current phase, implement it, flip its box to ✅ (or 🟡 with a note), run `npm run typecheck && npm test`, and commit. Do not skip ahead across phases.

---

## Phase 0 — Already built (baseline) ✅

These exist and work today (mock-data MVP with real auth). Verify before extending.

- [x] ✅ Firebase Auth — email/password sign up / sign in / sign out (`services/firebase/authService` *(currently `src/firebase/authService.ts`)*)
- [x] ✅ Firestore user profiles — `users/{uid}` + `operators/{uid}` (`userService`)
- [x] ✅ File uploads to Firebase Storage for operator docs (`storageService`)
- [x] ✅ Customer screens (mock data): HomeMap, BookingFlow, LiveTracking, JobHistory, MyVehicles, Account, Notifications
- [x] ✅ Operator screens: Onboarding (6 steps), Pending, Rejected, Home, Jobs, Earnings, Account, LiveJob
- [x] ✅ Role-based navigation (customer/operator) + verification-status routing (`navigation/RootNavigator`)
- [x] ✅ Firestore security rules — owner-only on users/operators; basic jobs rules (`firebase/firestore.rules`)
- [x] ✅ External services: geocoding/Photon, routing/OSRM, weather/Open-Meteo
- [x] ✅ State management — Context + reducer + AsyncStorage persistence (`state/`)
- [x] ✅ Client-side quote/pricing (mock) (`data/quote.ts`)
- [x] ✅ Client job service functions written: `createJob`, `subscribeToJob`, `subscribeToOpenJobs`, `acceptJob`, `updateJobStatus`, `updateDriverLocation` (`firebase/jobService`)

---

## Phase 1 — Core loop real (pricing + job spine) 🟡

> **Goal:** a customer gets a server-priced quote → requests a job → a driver accepts it. **This is the highest-value phase.**

### 1.0 Backend scaffold (M0)
- [ ] ⬜ `firebase init functions` — create `functions/` TypeScript package
- [ ] ⬜ Wire shared types: `functions` imports `src/shared/types` (single source of truth)
- [ ] ⬜ Firebase emulator suite running locally (Auth + Firestore + Functions)
- [ ] ⬜ `firebase.json` updated with a `functions` block

### 1.1 Pricing service (the fare engine — see `API_PLAN.md §4`)
- [ ] ⬜ Extract pure `priceQuote(inputs, rateCard) → breakdown` into `src/domain/pricing` (port `data/quote.ts`)
- [ ] ⬜ Port `priceQuote` into `functions/src/pricing.ts` (re-use the pure module)
- [ ] ⬜ Create `pricingConfig/current` rate-card doc (schema in `API_PLAN.md §4.6 A`)
- [ ] ⬜ Switch money to **integer pence** across quote → job → payment
- [ ] ⬜ `getQuote` callable — route server-side, price, write `quotes/{quoteId}`, return breakdown + quoteId
- [ ] ⬜ `quotes/{quoteId}` collection + rules (server-write only, single-use, TTL)
- [ ] ⬜ Booking screen displays the **server** quote (read-only) via `getQuote`

### 1.2 Job request & lifecycle
- [ ] 🟡 `requestJob` callable — accept `quoteId` (not a price), create `jobs/{jobId}` from stored quote *(client `createJob` exists but writes client price — replace)*
- [ ] ⬜ `acceptJob` callable — atomic transaction (no double-accept), approved-operator-only
- [ ] ⬜ `updateJobStatus` callable — enforce state machine (`en_route → arrived → completed`, cancel paths)
- [ ] 🟡 Driver job feed wired to `subscribeToOpenJobs` *(function exists; `OperatorHomeScreen` still on mock — wire it)*
- [ ] 🟡 Customer `LiveTrackingScreen` subscribes to job via `subscribeToJob` *(function exists; confirm screen uses it end-to-end)*

### 1.3 Roles & approval
- [ ] ⬜ `onUserDocCreated` trigger — set `{ role }` custom auth claim; app refreshes token after register
- [ ] ⬜ `submitOperatorVerification` callable — server-validate required fields → `pending_review`
- [ ] ⬜ Admin approval path (Firebase Console for MVP) + rules blocking self-approval
- [ ] ⬜ `onOperatorStatusChange` trigger — (push wired in Phase 2)

### 1.4 Rules & indexes
- [ ] ⬜ Tighten `jobs` rules — clients cannot set price/paymentStatus/illegal status (Functions own those)
- [ ] ⬜ Composite index: `jobs` on `status` + `createdAt`
- [ ] ⬜ Storage rules for `operators/{uid}/**`

---

## Phase 2 — Location tracking & notifications ⬜

> **Goal:** customer sees the driver move in real time; neither side misses a key event.

- [ ] 🟡 Driver broadcasts location — `OperatorLiveJobScreen` calls `updateDriverLocation` every ~5s while active *(function exists; wire + throttle)*
- [ ] ⬜ Customer map updates driver pin from `onSnapshot`
- [ ] ⬜ Cost guard: throttle writes, only while job active (document Firestore vs RTDB tradeoff)
- [ ] ⬜ `registerPushToken` callable — store FCM/Expo token on `users/{uid}.pushTokens[]`
- [ ] ⬜ Push triggers: driver accepted / arrived / completed → customer
- [ ] ⬜ Push triggers: onboarding approved / rejected → driver
- [ ] ⬜ (Optional) geocoding/routing proxy callables behind keyed providers (replace OSRM/Photon demo servers)

---

## Phase 3 — Payments ⬜

> **Goal:** customer pays, charge tied to the server quote.

- [ ] ⬜ Add `@stripe/stripe-react-native` to the app
- [ ] ⬜ Add `paymentStatus` field to `JobDoc` + types (`unpaid|authorized|paid|refunded`)
- [ ] ⬜ `createPaymentIntent(jobId)` callable — charge the **stored** quote total; returns `client_secret`
- [ ] ⬜ Stripe Payment Sheet in `BookingFlowScreen`
- [ ] ⬜ `stripeWebhook` HTTP function — verify signature; on success set `paymentStatus = "paid"`

---

## Phase 4 — Payouts (Stripe Connect) ⬜

> **Goal:** driver gets paid; platform retains its fee.

- [ ] ⬜ `createConnectOnboardingLink` callable — replace mock bank fields; store `stripeAccountId` on operator
- [ ] ⬜ Payout-on-complete trigger — capture charge, transfer driver cut (e.g. 80%), retain fee (20%)
- [ ] ⬜ `OperatorEarningsScreen` reads real payout records (`payouts/` or job field)

---

## Phase 5 — Hardening & launch prep ⬜

- [ ] ⬜ Input validation + error handling on every callable
- [ ] ⬜ Idempotency on webhooks/payouts (no double-charge / double-pay)
- [ ] ⬜ Emulator integration tests for the core loop
- [ ] ⬜ ErrorBoundary + telemetry (Sentry) in the app
- [ ] ⬜ Fix auth persistence (currently `inMemoryPersistence` — users re-login on restart)
- [ ] ⬜ App icons/splash, store metadata, env separation (dev/prod Firebase projects)
- [ ] ⬜ Functions region decision (UK users vs `nam5` Firestore — see `API_PLAN.md §9`)

---

## Structure refactor (parallel track — see `STRUCTURE.md`)

Can proceed alongside Phase 1; P1 steps directly feed the pricing/domain work above.

- [ ] ⬜ P0: path aliases (`@/*`) + `partner → operator` rename
- [ ] ⬜ P1: isolate `mocks/`, extract pure `domain/` (pricing + eligibility), extract `shared/ui` primitives
- [ ] ⬜ P2: migrate to `features/`, split god components; split state, remove inline mock/real branching
- [ ] ⬜ P3: ErrorBoundary, telemetry, `config/`, real splash, `__DEV__`-gate `dev/`

---

## Status summary (update when phases close)

| Phase | Status |
|---|---|
| 0 — Baseline | ✅ Complete |
| 1 — Core loop (pricing + jobs) | 🟡 In progress |
| 2 — Tracking & notifications | ⬜ Not started |
| 3 — Payments | ⬜ Not started |
| 4 — Payouts | ⬜ Not started |
| 5 — Hardening | ⬜ Not started |
| Structure refactor | ⬜ Not started |
