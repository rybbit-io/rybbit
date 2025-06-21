# Frontend Error Tracking Implementation Plan

## Overview

This document outlines the implementation plan for adding frontend error tracking to the Rybbit analytics system. Errors will be tracked as a new event type in the existing ClickHouse infrastructure.

## Key Decisions

1. **Storage**: Use existing `props` JSON column in ClickHouse events table
2. **Filtering**: Track only first-party errors (same domain as the website)
3. **Opt-in**: Error tracking requires explicit enablement via `data-track-errors="true"`
4. **Truncation**: Error messages limited to 500 chars, stack traces to 2000 chars

## Implementation Components

### 1. Error Event Structure

Errors will be stored with `type: 'error'` in the events table:

```typescript
{
  site_id: 123,
  type: 'error',
  event_name: 'TypeError', // The error type/name
  props: {
    message: 'Cannot read property...', // Truncated to 500 chars
    stack: '...', // Truncated to 2000 chars
    fileName: 'app.js',
    lineNumber: 42,
    columnNumber: 15,
    timestamp: '2025-01-20T10:30:00Z'
  },
  // Standard fields auto-populated:
  session_id, pathname, referrer, browser, os, device, country, etc.
}
```

### 2. Backend Changes

#### 2.1 Update `server/src/tracker/trackEvent.ts`

- Add 'error' to valid event types
- Validate error-specific properties
- Apply truncation to message (500) and stack (2000)

#### 2.2 Create `server/src/api/analytics/getErrorNames.ts`

- Similar structure to `getPageTitles.ts`
- Query errors grouped by `event_name`
- Return occurrence count and session count
- Support pagination and time filtering

### 3. Analytics Script Updates

#### 3.1 Add Error Capture

- Check for `data-track-errors="true"` attribute
- Install global error handler when enabled
- Filter errors to first-party only (same origin)
- Format and send error data to `/api/track`

#### 3.2 Error Filtering Logic

```javascript
// Only track errors from the same origin
if (error.fileName && !error.fileName.startsWith(window.location.origin)) {
  return; // Skip third-party errors
}
```

### 4. Frontend UI Components

#### 4.1 Create `client/src/api/analytics/useGetErrorNames.ts`

- React Query hook for fetching error data
- Support pagination parameters
- Return error names with counts

#### 4.2 Implement `client/src/app/[site]/errors/page.tsx`

- List view similar to pages implementation
- Display: Error Name | Occurrences | Sessions Affected | Percentage
- Pagination support
- No sparklines in initial version

### 5. Documentation

Update `docs/src/content/script.mdx`:

- Add `data-track-errors` to configuration options table
- Default value: `"false"`
- Description: "Set to 'true' to enable automatic error tracking. When enabled, captures JavaScript errors from your domain only."

## Implementation Order

1. **Backend trackEvent.ts** - Add error type support (validate and store)
2. **Analytics script** - Add error capture with first-party filtering
3. **Backend getErrorNames.ts** - Create the analytics endpoint
4. **Frontend API hook** - Create useGetErrorNames.ts
5. **Frontend UI** - Implement errors/page.tsx
6. **Documentation** - Update script.mdx

## Technical Considerations

### Performance

- Errors stored in existing props JSON column
- ClickHouse handles JSON queries efficiently
- Consider adding dedicated columns if query performance becomes an issue

### Privacy

- First-party only filtering reduces noise and privacy concerns
- Stack traces may contain sensitive file paths - truncation helps
- No personal data should be in error messages

### Rate Limiting

- Consider implementing rate limiting in future iterations
- Suggested: 10 errors per minute per session
- Not included in initial implementation for simplicity

## Future Enhancements

1. **Error Details View**: Click through to see full error details
2. **Browser/OS Breakdown**: Show which browsers are most affected
3. **Time Series**: Show error trends over time
4. **Source Maps**: Support for production source map resolution
5. **Error Grouping**: Smart grouping of similar errors
6. **Alerting**: Notify when error rates spike

## Success Criteria

1. Errors are successfully captured and stored in ClickHouse
2. Error list page shows aggregated error data
3. Only first-party errors are tracked
4. Documentation clearly explains the feature
5. No performance impact on sites that don't enable error tracking
