# Project Evolution & Refactor Log

How Vacation Planner evolved from a basic CRUD app into a collaborative, AI-powered travel platform.

---

## Phase 1: Core CRUD

**Goal:** Build a working trip planner with basic auth.

- Express + PostgreSQL backend with raw SQL queries
- React frontend with Vite and CSS Modules
- Email/password authentication with JWT
- Basic trip CRUD: create, view, edit, delete
- Schedule items as a simple table with manual ordering

**Architecture at this stage:** Monolithic frontend, flat route structure, no middleware beyond auth.

---

## Phase 2: Itinerary Builder

**Goal:** Make schedule management usable for real trip planning.

- Integrated `@dnd-kit` for drag-and-drop schedule reordering
- Built sparse index spacing system to minimize database writes on reorder
- Added time slots, cost tracking, and day grouping
- Created the "want to see" list as a staging area for activities
- Added mobile drag-and-drop support via `mobile-drag-drop` polyfill

**Key refactor:** Moved from sequential integer indices to sparse spacing, requiring a complete rewrite of the schedule data model and introduction of `checkIndexSpacing` and `renumberIndexDb` helpers.

---

## Phase 3: Travel Log & World Map

**Goal:** Give users a visual record of their travels.

- Built interactive world map using D3 geo projections
- Created country-level travel log (visited countries, favorites, notes)
- Added place tracking within countries: cities, restaurants, hotels, excursions
- Implemented privacy controls for travel log visibility

**Key decision:** Used D3 for the world map instead of Google Maps because the visualization needed to show country-level shading (visited vs. not visited), which Google Maps doesn't support well. Google Maps is still used for trip-level location display.

---

## Phase 4: Social & Collaboration

**Goal:** Transform from a solo tool into a social platform.

- Added user profiles with avatars and usernames
- Built follow system with pending/accepted/declined states
- Created trip sharing with owner/editor/reader permissions
- Added notifications for follow requests and trip invitations
- Built public trip feed for discovering other users' trips
- Implemented user search

**Key refactor:** Authorization middleware was completely rearchitected. The original `ensureOwnership` check (boolean: is owner or not) was replaced with a layered middleware chain supporting three permission levels. Every trip-related route was updated to use the new access control system.

---

## Phase 5: AI Integration

**Goal:** Let users get smart recommendations without leaving the app.

- Integrated Google Gemini API for chat-based trip assistance
- Built AI questionnaire flow for generating itineraries from preferences
- Added "generate schedule from wish list" — AI reads the want-to-see list and produces a day-by-day plan
- Implemented AI-recommended places that users can add to their list

**Key challenge:** Gemini responses needed parsing to extract structured schedule data from natural language. Built a parsing layer that converts AI output into the app's schedule format.

---

## Phase 6: Guest Mode & Onboarding

**Goal:** Reduce friction for new users.

- Built guest mode: full trip planning without signup
- Implemented localStorage-based trip persistence for guests
- Created guest-to-authenticated migration flow on signup
- Added email verification flow with Resend

**Key refactor:** The entire trip data layer was abstracted to support two backends: API calls (authenticated) and localStorage (guest). Components consume trips through a unified interface regardless of the storage mechanism.

---

## Phase 7: Testing & Stability

**Goal:** Build confidence for shipping changes.

- Added Vitest unit tests for shared validation utils and backend helpers
- Built integration tests with `pg-mem` (in-memory PostgreSQL) + Supertest
- Created Playwright E2E tests for schedule CRUD and guest-to-auth flows
- Set up root-level Vitest workspace config spanning frontend, backend, and shared

**Key decision:** Chose `pg-mem` over mocking the database layer. Since the app uses raw SQL (no ORM), mocking queries would have been fragile and wouldn't catch SQL bugs. `pg-mem` runs real SQL against an in-memory PostgreSQL-compatible engine, giving integration tests high fidelity without the overhead of a real database.

---

## What's Next

See the [Future Roadmap](../README.md#future-roadmap) in the main README.
