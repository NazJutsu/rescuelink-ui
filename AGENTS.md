# AGENTS.md

Guidance for AI agents working in this repository. Read this first.

## What this project is

**RescueLink** — an on-demand vehicle recovery marketplace (Uber-style, for roadside breakdown/towing). Two sides:
- **Customer** — requests recovery, sets pickup/drop-off, gets a price, tracks the driver.
- **Operator** (driver) — completes compliance onboarding, accepts jobs, drives, gets paid.

Current state: a **mock-data MVP with real Firebase Auth**. The job → match → track → pay loop is being made real via Cloud Functions. See the doc set below.

## Tech stack

- **Expo SDK 54**, React Native 0.81, React 19, **TypeScript** (`strict`)
- **React Navigation v7** (native-stack + bottom-tabs)
- **Firebase 12** — Auth + Firestore (+ Storage); security rules in `firebase/firestore.rules`
- **State:** React Context + `useReducer` + AsyncStorage persistence
- **Maps/location:** `react-native-maps`, `expo-location`
- **External APIs:** Photon (geocoding), OSRM (routing), Open-Meteo (weather)
- **Tests:** Jest (`jest-expo`)
- **Backend (planned):** Firebase Cloud Functions in a `functions/` package (this repo, monorepo)

## Commands

```bash
npm install            # install deps
npx expo start         # run the app (then i = iOS, a = Android, w = web)
npm run typecheck      # tsc --noEmit  — run after every change
npm run lint           # expo lint
npm test               # jest (run after every change)
```

Always run `npm run typecheck && npm test` before considering a task done.

## The doc set (read these before large changes)

| File | What it covers |
|---|---|
| `MVP_PLAN.md` | Original product/MVP plan and phases |
| `API_PLAN.md` | **Backend design** — Cloud Functions, the pricing service & fare engine, Firestore schemas (§4.6), security rules, build order |
| `STRUCTURE.md` | **Project structure & refactor guide** — target feature-first layout, file migration map, step order |
| `MVP_IMPLEMENTATION.md` | **The checklist** — what's done / in progress / not started. Update the checkboxes as you work |
| `AGENTS.md` | This file — repo map & conventions |

When you finish a unit of work, **tick the matching box in `MVP_IMPLEMENTATION.md`**.

## Repo map — where things are (current layout)

> The app currently uses a **layer-first** layout under `src/`. A **feature-first** refactor is planned in `STRUCTURE.md` — check there for target locations before moving files.

```
App.tsx                     # root component: providers + RootNavigator
index.ts                    # Expo entry
src/
├── navigation/             # RootNavigator.tsx (role/auth routing), types.ts (param lists)
├── screens/
│   ├── auth/               # LandingScreen, LoginScreen, RegisterScreen
│   ├── customer/           # HomeMapScreen (the big one, ~1.4k lines), BookingFlowScreen,
│   │                       #   LiveTrackingScreen, JobHistoryScreen, MyVehiclesScreen,
│   │                       #   AccountScreen, NotificationsScreen
│   ├── partner/            # operator screens (NOTE: folder says "partner", files say "Operator")
│   │                       #   Onboarding, Pending, Rejected, Home, Jobs, Earnings, Account, LiveJob
│   └── shared/             # LegalScreen
├── components/             # shared UI: ui.tsx (RLButton/RLField/RLSectionLabel), FieldGroup,
│                           #   MobileField, RoleBanner
├── state/                  # AppContext.tsx (the single app context + actions),
│                           #   reducer.ts, storage.ts (AsyncStorage), *.test.ts
├── firebase/               # config.ts (init + isFirebaseConfigured), authService, userService,
│                           #   jobService, storageService, authErrors
├── services/               # photon.ts (geocode), osrmRouting.ts (routing), geocoding.ts
│                           #   (wraps photon+device), openMeteo.ts (weather), rescueLinkApi.ts (stale)
├── data/                   # quote.ts (pricing logic) + quote.test.ts, operatorProfile.ts,
│                           #   customerSeed.ts, notificationsSeed.ts, activeJob.ts  (mock + logic mixed)
├── theme/                  # tokens.ts (colors, spacing, radii) — use these, never hardcode
├── types/                  # index.ts — the domain model (User, Vehicle, Job, OperatorProfile, …)
├── utils/                  # geo.ts (LatLng, distance), greeting.ts
└── dev/                    # dev-only page-number badges (DevPageBadge, withDevPageBadge)
```

### Quick "where do I find…?"
- **Domain types / data shapes** → `src/types/index.ts`
- **Routing & which screen shows when** → `src/navigation/RootNavigator.tsx`
- **Global app state & actions (login, jobs, operator profile)** → `src/state/AppContext.tsx`
- **Firestore reads/writes** → `src/firebase/*Service.ts` (don't call the SDK directly from screens)
- **Pricing / quote math** → `src/data/quote.ts` (being moved to `domain/pricing` — see STRUCTURE.md)
- **Colors / spacing** → `src/theme/tokens.ts`
- **Geocoding / routing / weather** → `src/services/`
- **Is the backend wired?** → `isFirebaseConfigured()` in `src/firebase/config.ts` (the app runs in mock mode when env vars are absent)

## Conventions

- **TypeScript strict.** No `any` without justification. Keep the domain model in `types/`.
- **Theme tokens only** — import `colors/space/radii` from `theme/tokens`; never hardcode hex/sizes.
- **Reuse UI primitives** in `components/` (`RLButton`, `RLField`, …) instead of re-styling inline.
- **Firestore access goes through the service layer** (`firebase/*Service.ts`), not raw SDK calls in components.
- **Money:** the backend contract uses **integer pence** (see `API_PLAN.md §4.6`). The client currently uses pound-floats — converging on pence.
- **Mock vs real:** the app branches on `isFirebaseConfigured()`. New code should prefer pushing that decision into the service layer (see STRUCTURE.md), not adding more inline `if` branches in screens.
- **Pricing is server-authoritative.** The client may display an estimate; the binding price comes from the server `getQuote`/stored quote. Never trust a client-supplied price.
- **File size:** if a screen exceeds ~200 lines, extract hooks/sub-components (target convention from STRUCTURE.md).
- **Tests colocate** with the unit (`*.test.ts`). Add/maintain tests for `domain/` logic.

## Naming note (active cleanup)

There is intentional drift being resolved: the folder `screens/partner/` contains files named `Operator*`, and the role type is `operator`. **Use `operator` everywhere** in new code; the `partner` folder is slated for rename (STRUCTURE.md P0).

## Safety / scope

- Don't commit secrets. Firebase config comes from `EXPO_PUBLIC_*` env vars (`.env`, gitignored; see `.env.example`).
- Don't introduce a price calculation on the client that the server doesn't re-derive.
- Keep `src/dev/` behind `__DEV__` — it must not ship in production bundles.
- Update `MVP_IMPLEMENTATION.md` checkboxes when work lands.
