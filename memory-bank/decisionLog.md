# Decision Log

This file records architectural and implementation decisions using a list format.

## Decision

2025-05-31 13:49:52 - Memory Bank Architecture Implementation

## Rationale

Implemented a comprehensive Memory Bank system to maintain project context across different modes and sessions. This decision was made to:

- Ensure continuity of project understanding across different development sessions
- Provide a centralized location for tracking architectural decisions and progress
- Enable better collaboration and knowledge transfer
- Support the complex, multi-component architecture of Rybbit Analytics

## Implementation Details

- Created five core Memory Bank files: productContext.md, activeContext.md, progress.md, decisionLog.md, and systemPatterns.md
- Established initial project context based on projectBrief.md
- Set up tracking mechanisms for ongoing development activities
- Prepared framework for documenting future architectural decisions and patterns

[2025-05-31 22:00:48] - Fixed rrweb CDN URL in tracking script

- **Issue**: The rrweb CDN URL `https://cdn.jsdelivr.net/npm/rrweb@2/dist/rrweb.min.js` was returning "Couldn't find the requested release version 2" error
- **Investigation**: Browsed jsdelivr CDN to find correct file structure for rrweb package
- **Solution**: Updated URL to `https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.4/dist/rrweb.min.js` (current stable version)
- **Impact**: Session replay functionality in Rybbit Analytics tracking script will now load properly
- **File Modified**: `server/public/script-full.js` line 22-23

[2025-05-31 22:03:15] - Migrated ReplayPlayer from CDN to npm package

- **Issue**: ReplayPlayer component was using CDN loading for rrweb-player instead of the npm-installed package
- **Solution**:
  - Removed CDN loading logic (lines 25-59 in original file)
  - Added proper npm imports: `import { Replayer } from "rrweb-player"` and `import "rrweb-player/dist/style.css"`
  - Updated TypeScript types: `replayerRef` now uses `Replayer | null` instead of `any`
  - Removed `rrwebLoaded` state and related loading logic
  - Simplified component initialization to use direct npm imports
- **Impact**: More reliable loading, better TypeScript support, eliminates CDN dependency
- **File Modified**: `client/src/app/[site]/replays/components/ReplayPlayer.tsx`

[2025-05-31 22:13:57] - Enhanced session_replay_metadata table with comprehensive metadata columns

- **Issue**: Session replay metadata table lacked detailed context information, requiring JOINs to events table for analytics queries
- **Solution**: Added 15 new metadata columns to session_replay_metadata table following denormalized approach:
  - Geographic Data: country, region, city, lat, lon
  - Device/Browser Data: browser, browser_version, operating_system, operating_system_version, language, screen_width, screen_height, device_type
  - Session Context: channel, hostname, referrer
- **Implementation**: Used same data types and patterns as events table (LowCardinality for categorical data, appropriate numeric types)
- **Impact**: Enables efficient session replay queries without JOINs, improves query performance and analytics capabilities
- **File Modified**: `server/src/db/clickhouse/clickhouse.ts` lines 113-130

[2025-05-31 22:16:36] - Fixed rrweb-player import and usage in ReplayPlayer component

- **Issue**: ReplayPlayer component had incorrect import and usage of rrweb-player package
- **Root Cause**: Code was using incorrect API - importing `Replayer` instead of `rrwebPlayer` class, wrong constructor format, and incorrect event listener methods
- **Solution Applied**:
  1. Fixed import: Changed from `import Replayer from "rrweb-player"` to `import rrwebPlayer from "rrweb-player"`
  2. Updated TypeScript ref type: Changed from `useRef<Replayer | null>(null)` to `useRef<rrwebPlayer | null>(null)`
  3. Fixed instantiation: Changed from `new Replayer(events, {...})` to `new rrwebPlayer({target: containerRef.current, props: {events, ...}})`
  4. Updated event listeners: Changed from `.on()` method to `.addEventListener()` method for all event handlers
  5. Fixed cleanup: Changed from `.destroy?.()` to `.$destroy?.()` (Svelte component method)
- **Impact**: ReplayPlayer component now uses correct rrweb-player API, ensuring proper functionality and TypeScript compatibility
- **File Modified**: `client/src/app/[site]/replays/components/ReplayPlayer.tsx`

[2025-05-31 22:18:40] - Fixed ReplayPlayer cleanup logic to remove non-existent destroy methods

- **Issue**: ReplayPlayer component was calling non-existent `destroy()` and `$destroy()` methods on rrweb-player instance
- **Root Cause**: TypeScript definitions for rrweb-player don't include these methods - the class extends SvelteComponent but only exposes specific methods like `play()`, `pause()`, `addEventListener()`, etc.
- **Solution Applied**:
  1. Removed `replayerRef.current.destroy?.()` call in cleanup effect (line 37)
  2. Removed `replayerRef.current.$destroy?.()` call in unmount cleanup (line 112)
  3. Simplified cleanup to just clear container innerHTML and reset ref to null
  4. Added explanatory comments about rrweb-player being a Svelte component that manages its own lifecycle
- **Impact**: Eliminates TypeScript errors and potential runtime issues, relies on proper DOM cleanup which is sufficient for rrweb-player
- **File Modified**: `client/src/app/[site]/replays/components/ReplayPlayer.tsx`

[2025-05-31 22:30:47] - Fixed missing site_id parameter in replay sessions API request

- **Issue**: The backend API `/api/replay/getSessions` was receiving `undefined` for the required `site_id` parameter, causing a Zod validation error
- **Root Cause**: Mismatch between route definition and parameter parsing - route was defined as `/api/replay/sessions/:site` but function was trying to read `site_id` from query parameters instead of URL parameters
- **Solution Applied**:
  1. **Backend Fix**: Updated `server/src/api/replay/getSessions.ts` to properly parse URL parameters using separate schemas for params and query
     - Added `getSessionsParamsSchema` for URL parameter validation (`site`)
     - Modified `getSessionsQuerySchema` to remove `site_id` (now comes from URL params)
     - Updated function to read `site` from `request.params` instead of `request.query`
  2. **Frontend Fix**: Updated `client/src/api/analytics/useGetReplaySessions.ts` to use correct API endpoint path
     - Changed URL from `/replay/sessions/${site}` to `/api/replay/sessions/${site}` (added missing `/api` prefix)
- **Impact**: Replay sessions API now correctly receives site_id parameter, eliminating Zod validation errors and enabling proper session filtering
- **Files Modified**:
  - `server/src/api/replay/getSessions.ts` (parameter parsing logic)
  - `client/src/api/analytics/useGetReplaySessions.ts` (API endpoint URL)

[2025-05-31 22:35:20] - Fixed double /api prefix in replay sessions API URL construction

- **Issue**: Frontend was making requests to `/api/api/replay/sessions/1` instead of `/api/replay/sessions/1`, causing "Route not found" errors
- **Root Cause**: The `useGetReplaySessions.ts` hook was incorrectly adding `/api` prefix to the URL when `BACKEND_URL` already includes `/api`
- **Investigation**:
  - Confirmed replay routes are properly registered in server (`/api/replay/sessions/:site` at line 260)
  - Confirmed routes are included in `ANALYTICS_ROUTES` for public access (lines 168-169)
  - Found that `BACKEND_URL` constant already includes `/api` suffix (lines 3-4 in const.ts)
  - Discovered that all other analytics hooks correctly use `${BACKEND_URL}/endpoint` pattern without adding extra `/api`
  - Found that `useGetReplaySession.ts` was already using the correct pattern
- **Solution**: Removed the extra `/api` prefix from URL construction in `useGetReplaySessions.ts`
  - Changed from: `${BACKEND_URL}/api/replay/sessions/${site}`
  - Changed to: `${BACKEND_URL}/replay/sessions/${site}`
- **Impact**: Replay sessions API requests now use correct URL path, eliminating route not found errors
- **File Modified**: `client/src/api/analytics/useGetReplaySessions.ts` line 73

[2025-05-31 22:48:04] - Changed default session replay sample rate from 10% to 100%

- **Issue**: Session replay was only recording 10% of sessions by default, causing most sessions to be skipped
- **Context**: User reported logs showing "Replay not started due to sample rate" with random: 0.4074, sampleRate: 0.1, result: false
- **Solution**: Updated default replay sample rate from "0.1" to "1.0" in script-full.js
- **Implementation**: Modified line 99 in `server/public/script-full.js` - changed fallback value from "0.1" to "1.0"
- **Impact**: All sessions will now be recorded by default unless explicitly overridden with `data-replay-sample-rate` attribute
- **Preserved Logic**: Kept parseFloat() and attribute reading logic intact, only changed the default fallback value
- **File Modified**: `server/public/script-full.js` line 99

[2025-05-31 23:04:51] - Fixed Zod validation error for session replay events site_id type mismatch

- **Issue**: Session replay API endpoint was rejecting requests with `ZodError: Expected number, received string at path ["site_id"]`
- **Root Cause**: Tracking scripts were extracting `site_id` from `data-site-id` HTML attribute (always returns string) but not converting to number before sending to API
- **Backend Expectation**: Zod schema in `server/src/api/replay/ingestEvents.ts` expects `site_id: z.number().int().positive()`
- **Frontend Behavior**: Scripts validated `isNaN(Number(SITE_ID))` but never actually converted the string to number in payload
- **Solution Applied**:
  1. **script-full.js**: Changed `SITE_ID` extraction to convert string to number: `const SITE_ID = Number(SITE_ID_STRING)`
  2. **script.js**: Applied equivalent fix to minified version: `const n=Number(e.getAttribute("data-site-id")||e.getAttribute("site-id"))`
  3. Added logging to track the conversion process for debugging
- **Impact**: Session replay events now send `site_id` as number type, eliminating Zod validation errors and allowing successful event ingestion
- **Files Modified**:
  - `server/public/script-full.js` (lines 75-84)
  - `server/public/script.js` (minified equivalent)
