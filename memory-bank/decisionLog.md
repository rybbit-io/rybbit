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

[2025-06-08 06:53:49] - Docker Build Context Fix: Changed all build contexts from subdirectory (./client, ./server) to monorepo root (.) in docker-compose.cloud.yml and GitHub Actions workflow. Updated Dockerfiles to use correct paths from monorepo root (e.g., COPY client/package.json instead of COPY package.json). This resolves the shared package access issue while maintaining compatibility between local and CI builds.

[2025-06-08 11:54:00] - TRPC Authentication Integration Fix

## Decision

Fixed TRPC authentication integration to resolve "Unauthorized onrequest" error.

## Rationale

The TRPC client was not configured to include authentication headers/cookies, causing the server's onRequest hook to reject all TRPC requests as unauthorized. This prevented proper authentication flow between client and server.

## Implementation Details

- Updated TRPC client configuration in QueryProvider.tsx to include `credentials: 'include'` for cookie-based authentication
- Modified server-side TRPC context to integrate with existing auth system using `getSessionFromReq()`
- Added TRPC authentication middleware with `isAuthed` middleware for protected procedures
- Created `publicProcedure` and `protectedProcedure` for different authentication requirements
- Added `/trpc` to PUBLIC_ROUTES to allow TRPC to handle its own authentication instead of the global onRequest hook
- Enhanced error handling in TRPC context creation

## Impact

- TRPC requests now properly include authentication cookies
- Server can validate user sessions for TRPC procedures
- Proper separation between public and protected TRPC procedures
- Eliminates "Unauthorized onrequest" errors for authenticated users

[2025-06-08 12:07:52] - **Docker Build Fix: TRPC Type Import Resolution**
**Problem**: GitHub Actions Docker build failing with "Cannot find module '@rybbit/server/src/router'" error during client build process.

**Root Cause**: Client was importing TRPC AppRouter types from server package, but Docker build context didn't include server code, making the `@rybbit/server` package unavailable during build.

**Solution Implemented**:

1. **Updated client/Dockerfile**: Added server package copying and building in deps stage

   - Copy server code: `COPY server ./server`
   - Build server: `RUN npm install && npm run build`
   - Copy built server to builder stage: `COPY --from=deps /app/server ./server`

2. **Updated client/tsconfig.json**: Added TypeScript path mapping for server package
   - Added path: `"@rybbit/server/*": ["../server/src/*"]`

**Technical Details**:

- Client package.json already had `"@rybbit/server": "file:../server"` dependency
- Issue was Docker build context isolation - server wasn't available during client build
- TRPC requires client to import server router types for type safety
- Solution maintains monorepo structure while ensuring Docker builds work

**Impact**: Fixes Docker build pipeline in GitHub Actions, enables successful client image creation with TRPC integration.

[2025-06-08 14:19:11] - TRPC Docker Build Dependency Resolution

## Decision

Resolved Docker build failures caused by TypeScript compilation attempting to compile server dependencies during client builds.

## Rationale

The client was importing TRPC AppRouter types directly from the server package, causing TypeScript to compile the entire server dependency chain during Docker builds. This led to cascading missing dependency errors, including UAParser namespace issues in server utilities.

## Implementation Details

- **Root Cause**: Client imported `AppRouter` type from `@rybbit/server/src/router`, triggering compilation of server runtime dependencies during client builds
- **Dependency Chain**: router.ts → context.ts → auth-utils.ts → utils.ts (with UAParser dependency)
- **Solution**: Fixed missing UAParser import in `server/src/utils.ts` by adding `import UAParser from "ua-parser-js"`
- **Architecture**: Maintained type-only import approach using `server/src/router-types.ts` as intermediary
- **Path Mapping**: Kept client tsconfig.json path mapping to `@rybbit/server/*` for type imports

## Impact

- Client builds now complete successfully without server dependency compilation errors
- Docker builds should work without requiring server dependencies in client container
- TRPC type safety maintained through proper AppRouter type imports
- Clean separation between client and server build processes restored

## Technical Details

- Fixed: `Cannot find namespace 'UAParser'` error in server/src/utils.ts:7:7
- Maintained: Type-only imports from server to client via router-types.ts
- Preserved: Full TRPC functionality and type inference
- Verified: Local client build success (npm run build)
