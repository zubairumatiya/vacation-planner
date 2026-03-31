# Technical Case Study & Post-Mortem

A deep dive into the hardest problems encountered while building Vacation Planner and how they were solved.

---

## 1. Google Maps API Cost Optimization

### The Problem

Google Maps Places API pricing is tier-based — the more fields you request, the higher the cost per call. With features like map search (returning 20+ results), autocomplete lookups, and resolving coordinates for every schedule item, an unoptimized approach would hit expensive API tiers hundreds of times per session.

Google offers a Places UI Kit that handles pricing optimally with simple setup, but it caps results at 20 places total — a hard limit that reduces functionality and user value for a search-heavy app like a trip planner. Rather than accept that tradeoff, I went with a hybrid approach: using the UI Kit where its constraints are acceptable (autocomplete) and building custom API integrations where I needed full control over pagination, caching, and result volume.

### The Solution

Built a multi-layered cost optimization strategy that minimizes API spend at every level:

**1. ID-first Text Search (free tier before paid tier)**

Instead of requesting full place details upfront, the map search endpoint first calls Text Search with an `ID_ONLY_FIELD_MASK` (`places.id,nextPageToken`) — a Basic-tier request. This returns place IDs without incurring the cost of higher-tier field requests. Only after checking which IDs are already cached does the system make a second call with the full field mask.

**2. Batch requests over individual lookups**

When place details are needed, the system re-issues a Text Search with `pageSize: 20` and the `FULL_FIELD_MASK` — one request that returns up to 20 fully-detailed places. The alternative would be calling the Place Details endpoint per item (20 individual requests). Text Search with 20 results counts as a single API request regardless of result count.

**3. Database caching with global benefit**

All fetched place data is upserted into a `place_details` table (67 columns covering every relevant field) and a `place_coordinates` table for fast lat/lng lookups. Before any API call, the system queries the cache:

```sql
SELECT * FROM place_details WHERE place_id = ANY($1)
```

If all requested IDs are cached, zero API calls are made. This cache is global — when one user searches for restaurants in Tokyo, every future user benefits from that cached data. Over time, the hit rate compounds and more requests become free.

**4. Multi-tier coordinate resolution**

The `/resolve-coordinates` endpoint uses a 5-step waterfall to avoid unnecessary API calls:
1. Check `place_coordinates` cache (cheapest — just lat/lng)
2. ID-only Text Search to discover the place ID
3. Check `place_coordinates` again with the discovered ID
4. Check `place_details` cache and extract coordinates from there
5. Last resort: single Place Details API call with a minimal field mask (`displayName,location`)

**5. Maximized field mask at no extra cost**

Since the required fields (photos, reviews, opening hours) already trigger the highest pricing tier, the `FULL_FIELD_MASK` was expanded to capture every potentially useful field — dining attributes, accessibility options, parking, generative summaries, and more. This costs nothing extra but gives the app richer data to work with now and in the future.

### Lessons Learned

- API cost optimization is a design problem, not just an implementation detail — the architecture has to be built around the pricing model
- Caching with global scope creates a compounding return: every new user's searches reduce future API costs for all users
- Understanding pricing tiers deeply (which fields trigger which tier) lets you maximize value per request
- Owning your data in a relational database gives you flexibility that API-only access never will — filtering, joining with trip data, analytics, all become possible

---

## 2. Guest-to-Authenticated Data Migration

### The Problem

Guest users can create trips stored in localStorage. When they sign up, their trip data needs to migrate to the database. This sounds simple, but edge cases made it complex:

- Guest trips have client-generated IDs that don't match the database's UUID format
- Schedule items reference their parent trip by the old guest ID
- The user might have already created trips as an authenticated user — IDs can't collide
- If the migration fails partway, the user could lose their guest data *and* not have it in the database

### The Solution

Built a dedicated migration flow that:

1. Reads all guest trips from localStorage
2. Creates each trip in the database via the standard API (which generates proper UUIDs)
3. Maps old guest IDs to new database IDs
4. Migrates schedule items and list items under the new trip IDs
5. Only clears localStorage after full confirmation from the API

The migration runs once after signup/login if guest data is detected, and is idempotent — running it twice won't create duplicates because localStorage is cleared on success.

### Lessons Learned

- Guest mode is a great UX pattern for reducing signup friction, but plan the migration path from day one
- Idempotency is non-negotiable for data migration operations
- It would have been easier to create client-side UUID's, but a malicious user could send duplicate or crafted UUIDs to overwrite other users’ data. Keeping UUID's generated by the backend maintains simplicity and security. 

---

## 3. Collaborative Conflict Detection (409 Overwrite Flow)

### The Problem

When two editors share a trip, they can modify the same schedule item simultaneously. Without any conflict detection, one user's changes silently overwrite the other's — potentially erasing high-effort work like a carefully researched restaurant list or a detailed day plan.

The app doesn't use WebSockets for real-time sync, so there's no way to lock items or broadcast live edits. The conflict has to be detected and resolved at save time.

### The Solution

Implemented **optimistic concurrency control** using a `last_modified` timestamp on trips. The flow:

1. When a user loads a trip, the frontend stores the current `last_modified` value
2. On save, the frontend sends this timestamp along with the update request
3. The backend compares the sent timestamp against the current `last_modified` in the database
4. If they don't match (another user saved in between), the backend returns a **409 Conflict** instead of silently overwriting
5. The frontend catches the 409 and shows the user an **overwrite confirmation** — they can choose to force-save their version or discard their changes

The `stateAwareConfirmation` middleware handles the 409 logic on the backend. On the frontend, the overwrite button re-sends the same request with a flag that bypasses the conflict check, letting the user consciously choose to overwrite.

### The Trade-off

The key design decision was whether to **automatically overwrite** (simpler UX, fewer clicks) or **prompt the user** (worse UX flow, but safer).

Chose to prompt because:
- Trip schedules can represent hours of research — silently erasing that is worse than an extra confirmation step
- Without real-time presence indicators, users have no way to know someone else is editing
- The likelihood of two users editing the same items at the same time is low, espcially when considering trip planning is dominated by one person.
- An automatic overwrite would make the "collaboration" feature feel broken — users would lose trust in shared editing

### Lessons Learned

- Optimistic Concurrency with timestamps is a pragmatic middle ground between no conflict detection and over-engineered full real-time sync
- The UX decision was driven by a combination of frequency of conflict, cost of data loss, and the level of UX interruption.
- Changing the key of a component forces it to unmount and remount,

---

## 4. Drag-and-Drop Index Spacing in PostgreSQL

### The Problem

Schedule items needed to be reorderable via drag-and-drop. The naive approach of using sequential integers (1, 2, 3...) required updating every subsequent row on each reorder. With trips containing 50+ activities across multiple days, this meant dozens of UPDATE queries per drag.

### The Solution

Adopted a **sparse index spacing** strategy. Items are assigned indices with large gaps (e.g., 1000, 2000, 3000). When an item is dropped between two others, its new index is the midpoint. This allows most reorders to require only a single UPDATE.

**When the gap gets too small** (items have been reordered many times in the same region), a background renumbering pass redistributes all indices evenly. The `checkIndexSpacing` helper detects when spacing has degraded below a threshold, and `renumberIndexDb` performs the bulk redistribution in a single transaction.

### Lessons Learned

- Premature optimization is real, but so is the N+1 update problem — sparse indexing is a pragmatic middle ground
- Database transactions are essential for bulk index updates to prevent inconsistent states
- The drag-and-drop UX (using @dnd-kit) was the easy part; the data model was the real challenge

---

## 5. JWT Refresh Token Race Conditions

### The Problem

When a user's access token expired, multiple API calls could fire simultaneously, each detecting the expired token and independently requesting a refresh. This caused:

- Multiple refresh token rotations, invalidating tokens mid-flight
- Intermittent 401 errors where users were randomly logged out
- Cascading failures when the first refresh succeeded but subsequent ones used the now-revoked token

### The Solution

Implemented a **token refresh queue** on the frontend. When the first request detects an expired token, it starts a refresh and stores the promise. All subsequent requests that detect the same expiry await the same promise rather than triggering their own refresh. Once the new token arrives, all queued requests retry with the fresh token.

**Key implementation details:**
- A shared `refreshPromise` variable in the auth context prevents duplicate refresh calls
- The refresh token is stored in an HTTP-only cookie (not accessible to JavaScript), so rotation happens server-side
- The backend validates refresh tokens against a database table and revokes the old token atomically during rotation

### Lessons Learned

- Token refresh logic is a deceptively complex distributed systems problem even in a single-client app
- HTTP-only cookies for refresh tokens eliminate an entire class of XSS token theft vulnerabilities
- Always think about concurrent requests when designing auth flows
