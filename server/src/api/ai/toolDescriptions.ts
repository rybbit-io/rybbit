export const getLiveUserCountToolDescription = "Retrieves the number of active users currently on the site.";

export const getOverviewToolDescription = `Retrieves an overview of website performance metrics. Returns an object with the following fields:
- users: Number of unique users.
- sessions: Number of sessions.
- pageviews: Number of pageviews.
- pages_per_session: Average number of pages viewed per session.
- session_duration: Average duration of a session.
- bounce_rate: Percentage of sessions with only one pageview.`;

export const getOverviewBucketedToolDescription = `Retrieves a "bucketed" overview of website performance metrics (data grouped by time intervals). Returns an array of objects with the following fields: 
- time: The starting point of the time interval.
- users: Number of unique users.
- sessions: Number of sessions.
- pageviews: Number of pageviews.
- pages_per_session: Average number of pages viewed per session.
- session_duration: Average duration of a session.
- bounce_rate: Percentage of sessions with only one pageview.`;

export const getParameterStatsToolDescription = `Retrieves the traffic breakdown for a specific web analytics parameter. Returns an array of objects with the following fields:
- value: Particular parameter value.
- count: Number of sessions (or total occurrences for events) associated with that value.
- percentage: Percentage share of the total sessions (or events) associated with that value.`;
