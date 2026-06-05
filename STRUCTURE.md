# RescueLink — Project Structure & Refactor Guide

**Goal:** move the app from its current layer-first MVP layout to a **production-grade, feature-first structure** that is easy to navigate, maintainable, and reusable.

This is a guide for an implementing agent (or developer). Work **top-down by priority** (P0 → P3). Each step is independently shippable — do not start a later step until the earlier ones are merged. Run `npm run typecheck` and `npm test` after every step.

---

## 1. Why change

The current structure is clean for an MVP but has issues that compound as the app grows:

| # | Issue | Impact |
|---|---|---|
| 1 | **God components** — `HomeMapScreen` 1,375 lines, `OperatorOnboardingScreen` 822, `BookingFlowScreen` 524. Each mixes data-fetching, business logic, inline styles, and rendering. | Unmaintainable, untestable |
| 2 | **Layer-first organization** — a single feature change touches `screens/`, `services/`, `data/`, `state/`. | Hard to navigate / reason about |
| 3 | **Monolithic state** — one `AppContext` with 19 values; every consumer re-renders on any change; `isFirebaseConfigured()` mock/real branching scattered through it. | Performance + clarity |
| 4 | **Naming drift** — folder `screens/partner/` vs. files `Operator*` vs. type `operator`. | Confusion |
| 5 | **`data/` mixes mock seed with real domain logic** — `customerSeed.ts` beside `quote.ts`. | Can't cleanly delete mocks when backend lands |
| 6 | **No path aliases** — relative imports (`../../theme/tokens`) break on every move. | Refactor friction |
| 7 | **UI duplication** — `Row`, cards, headers, section labels re-implemented inline in nearly every screen. | Inconsistency, bloat |
| 8 | **Missing prod infra** — no ErrorBoundary, no logging/monitoring, no `config/constants`, bare `<View>` hydration gate. | Not production-ready |

---

## 2. Target structure

```
src/
├── app/                      # App shell
│   ├── providers/            # compose context/store providers, ErrorBoundary
│   └── navigation/           # RootNavigator, types, per-feature navigators
│
├── features/                 # FEATURE-FIRST — each owns its screens, hooks, components, api
│   ├── auth/
│   │   ├── screens/          # LandingScreen, LoginScreen, RegisterScreen
│   │   ├── hooks/            # useLogin, useRegister
│   │   ├── components/       # auth-only UI
│   │   └── auth.types.ts
│   ├── booking/
│   │   ├── screens/          # HomeMapScreen, BookingFlowScreen
│   │   ├── hooks/            # useTripPlanner, useQuote, useAddressSearch
│   │   ├── components/       # MapCanvas, AddressSearchField, QuoteCard, VehiclePicker
│   │   └── booking.types.ts
│   ├── tracking/             # LiveTrackingScreen + hooks/components
│   ├── jobs/                 # JobHistoryScreen; operator job feed
│   ├── operator/             # (renamed from "partner") onboarding, earnings, live job, account
│   │   ├── screens/  hooks/  components/  onboarding/ (step components)
│   └── vehicles/             # MyVehiclesScreen
│
├── shared/                   # cross-feature, no feature dependencies
│   ├── ui/                   # DESIGN SYSTEM: Button, Field, Card, Row, ScreenHeader, Chip, SectionLabel…
│   ├── hooks/                # useDebounce, useAsync…
│   ├── utils/                # geo, greeting, format
│   └── types/                # domain model (was src/types/index.ts) — split by concern
│
├── services/                 # infrastructure clients (grouped by provider concern)
│   ├── firebase/             # config, authService, userService, jobService, storageService, authErrors
│   ├── location/             # geocoding, routing (osrm), places (photon)
│   └── weather/              # openMeteo
│
├── domain/                   # PURE business logic — no React, no I/O, fully unit-tested
│   ├── pricing/              # quote.ts → priceQuote(inputs, rateCard); quote.test.ts
│   └── operator/             # eligibility/submittable rules (from operatorProfile.ts)
│
├── config/                   # env access, constants, feature flags, default coords/values
│
├── store/                    # state, split by domain (auth, jobs, operator) — or a light store (Zustand)
│
└── mocks/                    # ALL seed/mock data — deletable in one move when backend is live
    ├── customerSeed.ts  notificationsSeed.ts  activeJob.ts  operatorProfile.seed.ts
```

### Conventions
- **File size budget:** screen files ≤ ~200 lines. Beyond that, extract a hook or sub-component.
- **A screen is a thin composition:** data via hooks, UI via `shared/ui` + feature `components/`, styles in a sibling `*.styles.ts`.
- **Dependency direction (one way):** `features/` → `shared/`, `services/`, `domain/`, `config/`, `store/`. `shared/`, `domain/`, `services/` never import from `features/`. `domain/` imports nothing app-specific (pure).
- **Naming:** one term — **`operator`** everywhere (retire "partner"). Components `PascalCase`, hooks `useX`, pure logic `camelCase`.
- **Barrels:** each feature and `shared/ui` exposes an `index.ts` for clean imports.
- **Tests colocate** with the unit (`priceQuote.test.ts` next to `priceQuote.ts`).

---

## 3. Refactor steps (in order)

### P0 — Foundations (safe, do first)

**Step 1 — Path aliases.**
Add to `tsconfig.json`:
```jsonc
"compilerOptions": {
  "strict": true,
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```
Add `babel-plugin-module-resolver` to `babel.config.js` (Expo) with the same `@ → ./src` map so Metro resolves it at runtime. Convert imports to `@/…` incrementally (or via codemod). **Verify the app still boots before continuing.**

**Step 2 — Rename `partner` → `operator`.**
Move `src/screens/partner/` → its destination under `features/operator/` (or rename in place first). Update all imports. Pure rename, no logic change.

### P1 — Separate concerns (unblocks the backend work)

**Step 3 — Isolate mocks.**
Move `customerSeed.ts`, `notificationsSeed.ts`, `activeJob.ts`, and the seed parts of `operatorProfile.ts` into `src/mocks/`. Goal: when the backend is real, deleting `src/mocks/` and its references is a single, obvious operation.

**Step 4 — Extract `domain/`.**
- `data/quote.ts` → `domain/pricing/priceQuote.ts` (+ move `quote.test.ts`). Generalize toward the rate-card model in `API_PLAN.md §4.6` (this is the exact code that ports into `functions/`). Keep it **pure** — no `Date.now()`, pass inputs in.
- The submittable/eligibility logic in `operatorProfile.ts` → `domain/operator/`.

**Step 5 — Extract shared UI primitives.**
Promote inline-duplicated patterns into `shared/ui/`: `Card`, `Row`, `ScreenHeader`, `Chip`, `ListRow`, plus the existing `RLButton`/`RLField`/`RLSectionLabel` (drop the `RL` prefix once namespaced under `shared/ui`). Replace inline reimplementations in screens as you migrate each feature (Step 6).

### P2 — The real maintainability win

**Step 6 — Migrate to `features/`, splitting god components.**
Per feature (start with `booking` — the largest): create `features/<name>/{screens,hooks,components}`, then **decompose each god component**:
- Pull data/effhe logic into hooks (`useTripPlanner`, `useQuote`, `useAddressSearch` out of `HomeMapScreen`).
- Pull repeated UI into `components/` (`MapCanvas`, `AddressSearchField`, `QuoteCard`).
- Move the `StyleSheet` to a sibling `*.styles.ts`.
- The screen becomes a thin composition.
Migrate one feature at a time; keep the app green between features.

**Step 7 — Split state, remove inline mock/real branching.**
- Break `AppContext` into domain stores (`auth`, `jobs`, `operator`) or adopt Zustand. Consumers subscribe to only what they use.
- **Push the `isFirebaseConfigured()` decision into the service layer** so screens/stores never branch on infrastructure — a service returns real or mock data behind one interface.
- Remove the leaky `setVehicles` raw-`setState` exposure; replace with intent actions (`addVehicle`, `removeVehicle`, `setDefaultVehicle`).
- Delete `dev*` actions and `services/rescueLinkApi.ts` (stale) as the real flows land.

### P3 — Production hardening

**Step 8.**
- Add an **ErrorBoundary** at the app shell with a fallback UI.
- Add **logging/monitoring** (e.g. Sentry) behind a thin `services/telemetry` wrapper.
- Add `config/` for env access, feature flags, and the scattered magic values (fallback coords, default distances).
- Replace the bare `<View>` hydration gate with a real splash/loading screen.
- Gate `src/dev/` (page badges) behind `__DEV__` so it is stripped from production bundles.

---

## 4. File migration map (quick reference)

| Current | Target |
|---|---|
| `src/screens/auth/*` | `src/features/auth/screens/` |
| `src/screens/customer/HomeMapScreen, BookingFlowScreen` | `src/features/booking/screens/` |
| `src/screens/customer/LiveTrackingScreen` | `src/features/tracking/screens/` |
| `src/screens/customer/JobHistoryScreen` | `src/features/jobs/screens/` |
| `src/screens/customer/MyVehiclesScreen` | `src/features/vehicles/screens/` |
| `src/screens/customer/AccountScreen, NotificationsScreen` | `src/features/<account|notifications>/` |
| `src/screens/partner/*` | `src/features/operator/screens/` (rename) |
| `src/components/ui.tsx, FieldGroup, MobileField, RoleBanner` | `src/shared/ui/` |
| `src/data/quote.ts (+test)` | `src/domain/pricing/` |
| `src/data/operatorProfile.ts` (rules) | `src/domain/operator/` |
| `src/data/customerSeed, notificationsSeed, activeJob` | `src/mocks/` |
| `src/services/photon, osrmRouting, geocoding` | `src/services/location/` |
| `src/services/openMeteo` | `src/services/weather/` |
| `src/services/rescueLinkApi.ts` | delete (stale) |
| `src/firebase/*` | `src/services/firebase/` |
| `src/types/index.ts` | `src/shared/types/` (split by concern) |
| `src/utils/*`, `src/theme/*` | `src/shared/utils/`, `src/shared/ui/theme/` |
| `src/state/*` | `src/store/` (split by domain) |
| `src/navigation/*` | `src/app/navigation/` |
| `src/dev/*` | keep, `__DEV__`-gate |

---

## 5. Definition of done

- No screen file > ~200 lines; god components decomposed into hooks + components + styles.
- `features/` is self-contained; dependency direction holds (nothing in `shared`/`domain`/`services` imports `features`).
- One naming term (`operator`); `partner` retired.
- `src/mocks/` is the only place seed data lives and is deletable in isolation.
- Pricing/eligibility logic is pure, in `domain/`, unit-tested, and shared with `functions/`.
- Path aliases in use; no `../../..` imports remain.
- ErrorBoundary, telemetry, config layer, and real splash in place; `dev/` stripped from prod builds.
- `npm run typecheck`, `npm run lint`, and `npm test` all pass.
