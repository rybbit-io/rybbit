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

[2025-06-08 16:43:52] - Enhanced authedFetchWithError to use axios with query parameter support

## Rationale

User requested to replace all instances of authedFetch with authedFetchWithError and wanted to use axios specifically for its params support. This decision was made to:

- Provide clean object-based query parameter support instead of manual string template literals
- Maintain consistency with axios patterns for HTTP requests
- Prepare for eventual replacement of all authedFetch instances
- Leverage axios's built-in parameter serialization and error handling

## Implementation Details

- Added axios dependency to client package.json
- Modified authedFetchWithError to accept query parameters as objects
- Maintained overloaded function signature for backward compatibility
- Used axios withCredentials: true to maintain authentication behavior
- Function now supports both query params as objects and full axios config objects

[2025-06-08 16:46:58] - Simplified authedFetchWithError function signature

## Rationale

User feedback indicated they didn't like the overloading behavior and wanted the 2nd argument to always be params instead of config. This decision was made to:

- Provide a cleaner, more predictable API
- Remove complexity from function signature detection
- Make the second parameter always represent query parameters
- Keep axios configuration as the third parameter for advanced use cases

## Implementation Details

- Removed overloaded function signature detection logic
- Second parameter is now always `params?: Record<string, any>`
- Third parameter remains `config: AxiosRequestConfig = {}` for advanced axios options
- Simplified function body to always treat second argument as query parameters

[2025-06-08 19:13:30] - Added past 24-hour mode support to performance analytics hooks

## Rationale

User requested to add support for the past 24-hour mode to useGetPerformanceTimeSeries and useGetPerformanceOverview hooks, following the same pattern already implemented in useGetPerformanceByDimension. This decision was made to:

- Provide consistent API behavior across all performance analytics hooks
- Support real-time analytics for the last 24 hours using pastMinutes parameters
- Maintain backward compatibility with existing date-range based queries
- Ensure proper query key differentiation between different time modes

## Implementation Details

- Modified useGetPerformanceTimeSeries to detect `time.mode === "last-24-hours"`
- Modified useGetPerformanceOverview to detect `time.mode === "last-24-hours"`
- Added conditional query parameter logic using pastMinutesStart/pastMinutesEnd for 24-hour mode
- Updated query keys to include mode differentiation ("past-minutes" vs "date-range")
- Maintained existing date-based approach for all other time modes
- Used same pattern as useGetPerformanceByDimension for consistency

[2025-01-08 19:23:09] - **Code Deduplication: Query Parameter Logic Refactoring**

- **Decision**: Created a centralized `getQueryParams` utility function to eliminate duplicated conditional logic across analytics hooks
- **Problem**: Found 7+ instances of identical `isPast24HoursMode` conditional logic for query parameter construction
- **Solution**:
  - Created `getQueryParams(time, pastMinutesStart?, pastMinutesEnd?)` utility in `client/src/api/utils.ts`
  - Handles both past-24-hours mode (using pastMinutesStart/End) and regular date-based queries
  - Supports optional custom past minutes parameters for complex cases
- **Files Refactored**:
  - `useGetPerformanceTimeSeries.ts` - Reduced ~20 lines to 3 lines
  - `useGetPerformanceOverview.ts` - Simplified conditional logic
  - `useGetPerformanceByDimension.ts` - Removed duplicated logic
  - `useSingleCol.ts` - Enhanced with custom past minutes support
  - `usePaginatedSingleCol.ts` - Simplified query parameter construction
  - `useInfiniteSingleCol.ts` - Removed conditional logic duplication
  - `useGetPageTitles.ts` - Standardized query parameter handling
- **Benefits**: Improved maintainability, reduced code duplication, centralized time-based query logic
- **Impact**: Significant reduction in duplicated code across analytics layer

[2025-01-08 19:31:12] - **Hook Consolidation: useGetOverview Functions**

- **Decision**: Combined `useGetOverview` and `useGetOverviewPastMinutes` into a single, flexible hook
- **Problem**: Two separate hooks with duplicated logic and similar functionality
- **Solution**:
  - Enhanced `useGetOverview` to accept optional `pastMinutesStart` and `pastMinutesEnd` parameters
  - Maintained backward compatibility by keeping `useGetOverviewPastMinutes` as a wrapper function
  - Integrated with the `getQueryParams` utility for consistent query parameter handling
  - Implemented intelligent query key generation based on parameters used
- **Benefits**:
  - Reduced code duplication between the two hooks
  - Simplified API while maintaining backward compatibility
  - Consistent with other analytics hooks using `getQueryParams` utility
  - Single source of truth for overview data fetching logic
- **Impact**: Improved maintainability and consistency across overview data fetching

[2025-01-08 19:36:50] - **Bug Fix: TypeScript Error in useGetOverview**

- **Problem**: TypeScript error "Argument of type 'number' is not assignable to parameter of type 'Record<string, any>'" when calling `getQueryParams` with `pastMinutesStart` parameter
- **Root Cause**: Incorrect function call signature - `getQueryParams` expects parameters as `(time, additionalParams, options)` but was being called with individual numbers
- **Solution**: Fixed function call to use correct parameter structure: `getQueryParams(timeToUse, { filters }, { pastMinutesStart, pastMinutesEnd })`
- **Additional Work**: Updated all callsites of `useGetOverviewPastMinutes` to use the consolidated `useGetOverview` hook
- **Files Updated**:
  - [`useGetOverview.ts`](client/src/api/analytics/useGetOverview.ts:1) - Fixed function call signature
  - [`useGetOverviewWithInView.ts`](client/src/api/analytics/useGetOverviewWithInView.ts:1) - Updated import and comment
  - [`SiteCard.tsx`](client/src/components/SiteCard.tsx:1) - Replaced `useGetOverviewPastMinutes` with `useGetOverview`
  - [`Overview.tsx`](client/src/app/[site]/main/components/MainSection/Overview.tsx:1) - Replaced both instances of `useGetOverviewPastMinutes` with `useGetOverview`
- **Impact**: Eliminated TypeScript errors and completed hook consolidation across the codebase

[2025-06-09 17:59:00] - **Generic Interface Implementation: FilterParams Type Conversion**

## Decision

Converted the `FilterParams` interface into a generic type using intersection types to allow extending with additional properties.

## Rationale

User requested to make the existing `FilterParams` interface generic so it could be extended with additional properties like `FilterParams<{something: number}>`. The original interface-based approach with `extends` didn't properly merge the generic type parameter, causing TypeScript errors when trying to access properties from the generic type.

## Implementation Details

- Changed from `export interface FilterParams<T = {}> extends BaseParams {}` to `export type FilterParams<T = {}> = BaseParams & T`
- Used intersection types (`&`) instead of interface extension to properly merge the base properties with the generic type parameter
- Maintained `BaseParams` interface for the core filtering properties (startDate, endDate, timeZone, filters, pastMinutesStart, pastMinutesEnd)
- Added `OverviewParams<T>` as an alias for backward compatibility
- This allows proper type safety when using `FilterParams<{bucket: TimeBucket}>` where both base properties and the `bucket` property are accessible

## Impact

- Enables type-safe extension of filtering parameters across the analytics API
- Maintains backward compatibility with existing code
- Fixes TypeScript errors in files like [`getPerformanceTimeSeries.ts`](server/src/api/analytics/performance/getPerformanceTimeSeries.ts:187) that use extended filter parameters
