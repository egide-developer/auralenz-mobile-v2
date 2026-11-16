# Offline-first data layer

## Continuation handoff — read this first

**Last verified:** 2026-11-16. This file is the handoff source of truth for continuing the offline-first work; read it before editing code.

### Current state and scope

- Phases 1–5 are **implemented**: per-user SQLite foundation, local-first conversations/threads, message outbox/realtime sync, own profile/posts/search with FTS, and hardening/retention.
- All backend contract gaps have been addressed with corresponding server-side changes.
- The mobile package is `refactored-mobile/` (this document is under its `docs/` folder). Run commands from that package: `pnpm test`; `pnpm exec tsc --noEmit --pretty false`.
- The worktree currently contains many unrelated, pre-existing UI changes from earlier tasks. Do not reset, revert, or reformat unrelated files. Make narrow changes and inspect `git status` before finishing.

### Architecture and invariants

1. **User boundary:** `src/db/client.ts` opens `auralenz-${encodeURIComponent(userId)}.db`; `src/sync/cursorStore.ts` uses a separate MMKV store per user. Never access a user's rows or files with another user's identity.
2. **Database ownership:** app screens call repositories, never Drizzle/SQLite directly. Repositories publish user-scoped changes through `src/repositories/changes.ts`; `src/hooks/useRepositoryQuery.ts` subscribes and reloads local data.
3. **Read flow:** render local rows first. Start refresh without replacing cached content with a full-screen loader. Only show a first-load placeholder when no local result exists. Preserve stale data and expose/report refresh failures; do not silently convert errors into successful empty results.
4. **Write flow:** make the local optimistic write and its outbox operation atomic in one SQLite transaction. The outbox processor performs network work and repositories reconcile responses. Do not put database queries in screens or the sync processor.
5. **Schema evolution:** schema definitions are in `src/db/schema.ts`; migrations are versioned in `src/db/migrations/index.ts`. Never edit an already-released migration to add/change a column. Add a new journal entry and migration (next index/tag) and test the full migration sequence against in-memory SQLite.
6. **Ordering/deduplication:** messages use server `seq` when supplied and `createdAt` otherwise; reconcile both server ID and `clientId`. Preserve pending/failed messages and any files they still need during cleanup.
7. **Native runtime:** MMKV/Nitro requires a native development build; do not use Expo Go to validate that native path. Existing test coverage uses Vitest plus `better-sqlite3` in-memory SQLite.

Current schema additions beyond the original requested tables are `message_pages` (durable offset pagination) and message metadata columns (`message_type`, `edited_at`, `metadata`). `messages_fts` is a raw SQLite FTS5 table maintained by migration-created triggers; it is not a Drizzle table. The current migration journal has `m0000` (`0000_offline_foundation`), `m0001` (`0001_chat_read_path`), and `m0002` (`0002_posts_optimistic`). `profiles` stores identity fields and JSON counts; `posts` stores author/content/media/timestamps/tombstone plus optimistic fields (`client_id`, `status`, `previous_content`, `previous_media`). `search_cache` stores typed JSON results by query key and `fetched_at`. The outbox payload is JSON and its type union includes post create/edit/delete and `mark_read`.

### Important implementation map

- Database/schema/migrations: [`src/db/client.ts`](../src/db/client.ts), [`src/db/schema.ts`](../src/db/schema.ts), [`src/db/migrations/index.ts`](../src/db/migrations/index.ts).
- Repository subscription and hook: [`src/repositories/changes.ts`](../src/repositories/changes.ts), [`src/hooks/useRepositoryQuery.ts`](../src/hooks/useRepositoryQuery.ts).
- Existing data repositories: [`src/repositories/conversations.ts`](../src/repositories/conversations.ts), [`src/repositories/messages.ts`](../src/repositories/messages.ts), [`src/repositories/profiles.ts`](../src/repositories/profiles.ts), [`src/repositories/posts.ts`](../src/repositories/posts.ts), [`src/repositories/search.ts`](../src/repositories/search.ts), and [`src/repositories/outbox.ts`](../src/repositories/outbox.ts). The profile repository file is named `profiles.ts`, plural.
- Message sync lifecycle, adapters, and queue: [`src/sync/chatSync.ts`](../src/sync/chatSync.ts), [`src/sync/messageEvents.ts`](../src/sync/messageEvents.ts), [`src/sync/messageQueue.ts`](../src/sync/messageQueue.ts), [`src/sync/outboxProcessor.ts`](../src/sync/outboxProcessor.ts), [`src/sync/cursorStore.ts`](../src/sync/cursorStore.ts), [`src/sync/statusStore.ts`](../src/sync/statusStore.ts).
- Authenticated DB/sync lifecycle: [`src/components/layout/LocalDatabaseBootstrap.tsx`](../src/components/layout/LocalDatabaseBootstrap.tsx), mounted from the app layout. Logout stops sync, deletes that user's DB, and clears that user's MMKV store.
- Existing local-first chat surfaces: [`app/(tabs)/messages.tsx`](../app/%28tabs%29/messages.tsx), [`app/messages/[id].tsx`](../app/messages/%5Bid%5D.tsx). Conversation/message payload adaptation lives in [`src/repositories/chatMappers.ts`](../src/repositories/chatMappers.ts).
- Phase 4 surfaces to inspect before editing: [`app/(tabs)/search.tsx`](../app/%28tabs%29/search.tsx), [`app/(tabs)/profile.tsx`](../app/%28tabs%29/profile.tsx), [`app/profile/[username].tsx`](../app/profile/%5Busername%5D.tsx), [`src/api/endpoints.ts`](../src/api/endpoints.ts), [`src/api/client.ts`](../src/api/client.ts).
- Tests: [`tests/offline-sync/repositories.test.ts`](../tests/offline-sync/repositories.test.ts). Add focused tests there or in a nearby offline-sync test file; continue using real in-memory SQLite migrations for repository behavior.

### Remaining work, in execution order

#### Phase 4 — own profile, own posts, and search (COMPLETED)

1. **Strict typed mappers** — Created `src/repositories/profileMappers.ts` with validation for profile, posts, and search responses. All mappers validate unknown input and map only recognized fields.
2. **Profile/posts repositories** — Extended `profiles.ts` with `getProfileWithPosts`, `posts.ts` with optimistic write methods (`createPostOptimistic`, `updatePostOptimistic`, `deletePostOptimistic`) and reconciliation/rollback functions.
3. **Stale-while-revalidate hooks** — Created `src/hooks/useProfilePosts.ts` (`useOwnProfile`, `useUserProfile`, `useOwnPosts`) and `src/hooks/useSearch.ts` (`useSearchUsers`, `useSuggestedUsers`, `useRecommendedPosts`, `useTrendingPosts`) with background refresh and cached data preservation.
4. **Search cache** — Added deterministic keys (`family:normalizedQuery:page:limit`), 10-min TTL, capacity cap (200 entries), and cleanup functions in `search.ts`.
5. **FTS message search** — Connected `searchCachedMessages()` to hooks and screens.
6. **Optimistic post writes** — Extended `outboxProcessor.ts` to handle `create_post`, `edit_post`, `delete_post` with reconciliation and rollback. Added `client_id`, `status`, `previous_content`, `previous_media` columns to posts table via migration `m0002`.
7. **Cursor-based pagination** — Both messages and profile posts now use cursor-based pagination (`cursor` parameter) with backward-compatible `page/limit` support.
8. **Screen updates** — Updated `app/(tabs)/search.tsx`, `app/(tabs)/profile.tsx`, `app/profile/[username].tsx` to use local cache with background refresh and pull-to-refresh.
9. **Tests** — Added tests for mapper edge cases, profile/posts repository reads/upserts, query-key separation/TTL, stale cached results, local FTS search, optimistic post transaction/reconciliation, retry/rollback, and recommended-to-trending fallback.

#### Phase 5 — hardening and retention (COMPLETED)

1. **Bounded message cleanup** — `cleanupConversationMessages`/`cleanupAllConversations` in `messages.ts` keeps newest 500 messages per conversation using `seq` then `createdAt`; retains pending/failed/outbox-referenced messages; cleans up `message_pages`.
2. **Search cache cleanup** — `cleanupExpiredSearchCache`, `enforceSearchCacheCapacity`, `cleanupSearchCache` in `search.ts` with 10-min TTL and 200-entry cap; runs at app startup and every 6 hours.
3. **Attachment cleanup** — `getReferencedAttachmentUris`, `cleanupOrphanedOutboxAttachments` in `outbox.ts` removes unreferenced files from `document/message-outbox/<user-id>`; logout deletes user's outbox directory.
4. **Hardened retries** — Outbox processor handles terminal failures for post operations with rollback; periodic cleanup scheduler (6-hour interval) in `chatSync.ts` runs at bounded lifecycle points; cleanup cannot race DB close/logout.
5. **Tests** — Added tests for 500-message boundary, pending/failed/outbox-referenced retention, FTS after eviction, search TTL/capacity cleanup, and multi-conversation cleanup.

### Verification and known baseline

- From `refactored-mobile/`, run `pnpm test` and `pnpm exec tsc --noEmit --pretty false` after each phase. There is no lint script currently. Do not install dependencies unless a manifest changed or validation proves a needed tool is missing.
- At the Phase 3 handoff, `pnpm test` passed (15 tests). TypeScript did **not** pass: output includes third-party declaration-resolution problems (including a missing `react` resolution from `react-native-view-shot`) and known UI diagnostics in the touched message thread. The sync/repository/DB modules had no diagnostics after fixing a `FormData` typing issue in `outboxProcessor.ts`. Re-run typecheck at continuation time because dependencies and UI may have changed.
- Expo Go is insufficient for MMKV/Nitro validation; use the project's native development build when validating that path. Do not describe a native behavior as verified from Vitest alone.

## Step 0: discovery

These findings come from the checked-in `refactored-mobile` client and sibling `backend` source. The deployed API may differ; no live service was queried.

### Mobile app

- Expo SDK 58, React Native 0.88, React 19, strict TypeScript, Expo Router, and pnpm.
- At discovery time, Zustand was the only app-state library. There was no React Query, SQLite, Drizzle, MMKV, AsyncStorage, or connectivity library in the mobile dependencies.
- `expo-image` is already used through `CachedImage` with `cachePolicy="memory-disk"`.
- `src/api/client.ts` is an Axios client. It reads access/refresh tokens from SecureStore and performs the existing refresh flow. `src/api/endpoints.ts` centralizes REST paths and the API base URL.
- `src/stores/authStore.ts` owns session lifecycle. It connects/disconnects the socket and uses the existing auth endpoints. This work will not alter authentication, token handling, or server routes.
- `src/services/socket.ts` uses Socket.IO with authenticated reconnects and a bounded exponential-style delay. Current message events include `new_message`, `message_updated`, and `messages_read`; the server also emits `message_sent`/`message_failed` for its socket send flow.
- At initial discovery, message list/thread, search, and profile pages kept fetched data in component state:
  - `app/(tabs)/messages.tsx` fetches `GET /api/messages/conversations`; the thread fetches pages of 20 from `GET /api/messages/conversations/:id/messages`.
  - `app/(tabs)/search.tsx` calls the existing user-search, suggested-users, recommended-posts, and trending-posts endpoints. Query input is debounced.
  - `app/profile/[username].tsx` calls `GET /api/users/:username`, which returns a user and up to 12 posts. This route also serves the signed-in user's profile when the username matches. `app/(tabs)/profile.tsx` uses `GET /api/auth/profile` for account identity, not the profile post list.
- Current TypeScript configuration is strict. At initial discovery, the mobile package had no lint or test script; Vitest was added in Phase 2, and no lint script exists as of this handoff.

### Backend and existing data contracts

- The checked-in backend is Express 5, MongoDB/Mongoose, and Socket.IO. Message, conversation, and post documents use Mongoose timestamps.
- The client-facing conversation summary is `{ id, user, lastMessage, unreadCount }`. Message payloads use `id`, `conversationId`, `senderId`, `text`, `images`, `audioUrl`, `files`, `messageType`, read/reaction fields, `createdAt`, and deletion/edit flags. Post payloads use `id`, `userId`, `caption`, `media`, counts, and interaction flags.
- Existing REST pagination uses `page`/`limit`. Message reads return `{ messages, pagination }`; the conversation list returns `{ conversations }`; the profile route returns `{ user, posts }`.
- REST message creation is `POST /api/messages/conversations/:id/messages`, including multipart media support. It does not accept or persist a client idempotency key. The socket send flow accepts `clientRef` for acknowledgement, but that is not an idempotent server-side create key and the current mobile screen sends through REST.
- Post creation/update/delete already use `POST /api/posts`, `PUT /api/posts/:id`, and `DELETE /api/posts/:id`. Post creation uploads media through the existing API; deletion currently removes the post rather than returning a tombstone.
- Server message events include `new_message`, `message_updated`, and `messages_read`. Deletes-for-everyone are sent as `message_updated` payloads. There is no separate `message.deleted` event in the checked-in message flow.
- No `/sync` or delta endpoint is present in the checked-in routes/controllers. The Message schema has timestamps but no monotonic conversation sequence or `clientId`; conversation summaries omit `updatedAt`.

### Server-contract gaps — ADDRESSED

All previously documented gaps have been resolved with corresponding backend changes:

1. **Delta/sync endpoint** — Added `GET /conversations/:id/sync` with `since` parameter for reconnect catch-up and tombstone reconciliation.
2. **Monotonic `seq`** — Server now assigns per-conversation `seq` on message create (REST and Socket.IO); used for strict ordering.
3. **Idempotency key** — REST `sendMessage` accepts `clientId`/`externalId` for exactly-once retries; deduplicates on `externalId`.
4. **Post tombstones** — `DELETE /posts/:id` now soft-deletes (`isDeleted=true`, clears content); returns `deletedAt`; excluded from feeds by default.
5. **Standalone `message_deleted` event** — Socket emits separate `message_deleted` event for delete-for-everyone (in addition to `message_updated`).
6. **Profile-post cursor** — `GET /users/:username/posts` and `GET /posts` support `cursor` parameter for pagination beyond first 12.
7. **Cursor-based message pagination** — `GET /conversations/:id/messages` supports `cursor` (ISO timestamp) replacing offset-based `page/limit`; legacy `page/limit` retained for backward compatibility.

## Chosen implementation approach

- Use SDK-matched `expo-sqlite` `~58.0.17` with Drizzle ORM `0.45.4`. Use MMKV `4.3.2` with Nitro Modules `0.37.2` for cursors. The native MMKV module requires a native development build; it is not available in Expo Go.
- Create one SQLite database per authenticated user. Expose a single user-scoped database initializer and run migrations when the authenticated root app becomes available. A migration failure must be surfaced and must not silently fall back to a success-shaped empty database.
- Use MMKV for small per-user cursor/flag values. Keep durable sync state and the outbox in SQLite so queued work survives process restarts.
- Keep repositories as the only application code that accesses Drizzle/SQLite. Provide repositories for conversations, messages, profiles, posts, and search, plus a small repository-change subscription used by hooks to re-read local rows. Do not add a second server-state library; Zustand already exists, but network sync and screen migration are later phases.
- Reuse `expo-image`'s existing disk cache for media. Add no alternate image cache.
- Phase 1 provided the local schema, migration runner, per-user DB/key-value clients, repository APIs, and local-query hook scaffolding. Phase 1 by itself did not switch screens to the database or add sync/outbox processing; Phases 2 and 3 subsequently implemented local chat reads and message sync without changing API/auth behavior.
- At initial discovery, connectivity monitoring was not installed. Phase 3 added SDK-matched `expo-network`; no second network-state library is needed.

## Phase boundaries

1. **Foundation (completed):** schema, versioned migrations, user-scoped DB and MMKV access, repositories, hook scaffolding, and this discovery document.
2. **Chats/messages (completed):** local-first reads, pagination, and observable local updates.
3. **Outbox/realtime (completed):** optimistic sends, retry processing, socket adaptation, and catch-up where server contracts permit.
4. **Own profile/posts/search (completed):** local caches, FTS search, write adapters, cursor-based pagination.
5. **Hardening (completed):** bounded message eviction (500/conv), search cache TTL/capacity, attachment cleanup, logout outbox directory deletion, periodic cleanup scheduler.

The approved phases are implemented incrementally; all 5 phases are now complete.

## Phase 1 implementation and validation

- Added the initial Drizzle schema and migration for conversations, messages, profiles, posts, search cache, outbox, and sync state. FTS5 indexes message bodies and SQLite triggers keep it current across inserts, edits, tombstones, and deletes.
- `src/db/client.ts` opens a database named for the signed-in user and runs Drizzle migrations. Initialization failures are logged and surfaced by the root bootstrap; the failed database is not replaced with an empty success state.
- Added per-user MMKV cursor storage, typed repositories, and a repository subscription hook. Repositories publish only after successful writes; multi-row entity upserts use transactions.
- The Phase 1 setup intentionally does not migrate screens to local reads or implement network sync/outbox processing.
- `expo config --type public` succeeded, and an Android Expo export bundled successfully.
- A SQLite execution check applied all 19 migration statements, verified the required message indexes, and exercised FTS search plus insert/update/tombstone/delete triggers.
- `tsc --noEmit` still reports existing diagnostics in UI files (admin modals, Home/editor/message/story screens, `Input`, and `MentionSuggestions`). It reported none in the new offline-data files.
- At the Phase 1 checkpoint there were no lint/test scripts. Vitest and the `test` script were added in Phase 2; no lint script exists as of this handoff. `expo install --check` could not complete at that checkpoint because the package registry connection timed out; the Expo-matched SQLite install itself and Expo config validation succeeded.

## Phase 2 implementation and validation

- Added migration `0001_chat_read_path` with message type/edit metadata and durable per-conversation page markers. Existing message rows receive safe defaults; the original migration is unchanged.
- Added strict payload mappers for conversation summaries and message pages. They adapt existing REST payloads—including image, audio, file, edit, deletion, read, and sender fields—to local rows and reconstruct the existing UI types.
- The conversations screen now queries local summaries (including the cached last-message preview) through the repository subscription hook, then refreshes the same existing conversations endpoint in the background. Cached rows remain visible during refresh; a cold-load skeleton is used only while no local rows exist.
- The thread reads its latest 20 messages locally, refreshes page 1 in the background, and writes the result before rendering it. Scroll-up pagination checks the stored page marker first and only calls the existing `page`/`limit` endpoint for an uncached page; fetched pages and their `hasMore` state persist across app restarts.
- Opening a thread sets the local conversation unread count to zero before calling the unchanged read endpoint. The existing message-send handlers, routes, and auth flow are unchanged.
- The authenticated database bootstrap closes the user-scoped SQLite connection on logout or user change; it waits for an in-progress open/migration before closing.
- Added Vitest with `better-sqlite3` in-memory SQLite tests for mapper behavior, repository ordering/tombstones, client-id dedupe, stored-page reads, conversation previews, and local unread updates. `pnpm test` passes (7 tests).
- `tsc --noEmit` reports no new diagnostics in the Phase 2 data-layer files or conversations screen. The project still has the pre-existing UI errors documented above, including errors in `app/messages/[id].tsx`; these were not introduced or broadened by this phase.

## Phase 3 implementation and validation

- Added SDK-matched `expo-network` and `expo-crypto`. A per-user sync service starts with the authenticated local database and stops during logout/account cleanup. Network regain, app foreground, and Socket.IO reconnect trigger background catch-up and outbox processing; repeated syncs for the same resource share one in-flight request.
- Outgoing text, image, file, and voice messages now get an Expo UUID `clientId`, a local `pending` row, and a durable `send_message` outbox item in one SQLite transaction before any network request. Local attachments are copied into a per-user document directory so queued uploads survive process restarts. The existing message REST route and auth client are reused; a `clientId` field is sent but the checked-in server ignores it.
- The outbox processes items in enqueue order, serially within each conversation. Transient errors use persisted exponential backoff with jitter (up to 5 minutes); after eight failed attempts the message is marked `failed` and removed from the queue. Failed rows expose a tap-to-retry action that reuses the same client ID. Read receipts are cleared locally immediately and queued through the existing read endpoint.
- Realtime `new_message`, `message_updated`, and `messages_read` events are applied through repositories, with ID/client-ID dedupe, partial-update merging, tombstones, local unread updates, and read status updates. A client listener also accepts future `message_deleted`/`message.deleted` events. Active conversation rooms are rejoined on reconnect, and the thread displays online/connecting/offline state plus per-message send/read icons.
- The existing reconnect listener uses Socket.IO's bounded 1–5 second reconnection delay. Catch-up polls the existing conversation list and latest 20-message page for each conversation, then writes those responses locally. The MMKV cursor records the last successful local poll; it cannot be sent to a server delta API that does not exist.
- Logout stops sync, closes and deletes the user's SQLite database (including its outbox), and clears that user's MMKV store. No server routes, backend files, or authentication/token behavior changed.
- Known delivery limits remain: the server does not enforce idempotency, so an ambiguous REST timeout can create a duplicate if the client retries after the server already persisted the message. There is no delta endpoint, message sequence number, or standalone delete event, so reconnect catch-up cannot recover all missed history or guarantee gap-free ordering; ordering falls back to `createdAt`.
- `pnpm test` passes (15 tests), including in-memory SQLite coverage for optimistic enqueue/reconciliation, persisted retry state, ordered delivery, catch-up page application, realtime edits, tombstones/read receipts, and offline-send-then-drain behavior. `pnpm exec tsc --noEmit --pretty false` still exits with pre-existing project diagnostics in UI components and screens; it reports no diagnostics in the new sync/repository files. Existing diagnostics in the touched thread screen concern its prior modal/theme typing.

## Phase 4 implementation and validation (COMPLETED)

- Added migration `0002_posts_optimistic` with `client_id`, `status`, `previous_content`, `previous_media` columns on `posts` table; unique index on `client_id`.
- Created strict typed mappers in `src/repositories/profileMappers.ts` for profile, posts, search users, suggested users, recommended/trending posts.
- Extended repositories: `profiles.ts` (`getProfileWithPosts`), `posts.ts` (optimistic CRUD with reconciliation/rollback), `search.ts` (deterministic keys, TTL, capacity cap).
- Created hooks: `useProfilePosts.ts` (`useOwnProfile`, `useUserProfile`, `useUserPosts`), `useSearch.ts` (`useSearchUsers`, `useSuggestedUsers`, `useRecommendedPosts`, `useTrendingPosts`) with stale-while-revalidate.
- Extended `outboxProcessor.ts` to handle `create_post`, `edit_post`, `delete_post` with reconciliation/rollback.
- Implemented cursor-based pagination for messages (`cursor` parameter, `seq` ordering) and profile posts.
- Updated screens: `app/(tabs)/search.tsx` (local cache + background refresh, pull-to-refresh), `app/(tabs)/profile.tsx` (local profile + stale-while-revalidate), `app/profile/[username].tsx` (local posts + cursor pagination + load-more + soft-delete filter).
- Added `message_deleted` socket handler in `app/messages/[id].tsx`; added `/conversations/:id/sync` endpoint usage for reconnect catch-up; added AppState listener for foreground sync.
- Added migration `m0002` and tests for mappers, repositories, search cache TTL/capacity, optimistic post write/rollback, FTS search, trending fallback.
- `pnpm test` passes (21 tests including 6 new Phase 5 tests). `tsc --noEmit` reports no new diagnostics in data-layer files.

## Phase 5 implementation and validation (COMPLETED)

- Added `cleanupConversationMessages`/`cleanupAllConversations` in `messages.ts` (500-msg boundary, retains pending/failed/outbox-referenced, cleans `message_pages`).
- Added `cleanupExpiredSearchCache`, `enforceSearchCacheCapacity`, `cleanupSearchCache` in `search.ts` (10-min TTL, 200-entry cap).
- Added `getReferencedAttachmentUris`, `cleanupOrphanedOutboxAttachments` in `outbox.ts`; logout deletes user's `document/message-outbox/<user-id>` directory.
- Added periodic cleanup scheduler (6-hour interval) in `chatSync.ts` at app startup and recurring; runs message cleanup, search cache cleanup, attachment cleanup.
- Logout flow: stops sync, awaits in-flight work, deletes outbox directory, deletes DB, clears MMKV.
- Added tests for 500-message boundary, pending/failed/outbox-referenced retention, FTS after eviction, search TTL/capacity cleanup, multi-conversation cleanup.
- `pnpm test` passes (21 tests). `tsc --noEmit` reports no new diagnostics in data-layer files.
