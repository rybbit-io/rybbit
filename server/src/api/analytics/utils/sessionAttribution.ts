// Session-level attribution aggregations, shared by every query that derives a
// session's (or user's) referrer/channel from its events. Keep these in sync with
// the per-parameter reports in getMetric.ts: the referrers report counts a session
// under its first non-empty referrer, so session views must derive referrer the
// same way or the same session shows different sources in different views.

// First non-empty referrer in the session; '' when every event is direct.
// Plain argMin(referrer, timestamp) is wrong here: a session that starts direct
// and later returns via an external link (30-minute session window) would show
// as Direct while the referrers report attributes it to that link.
export const SESSION_REFERRER_AGG = "argMinIf(referrer, timestamp, referrer != '')";

// Channel values that carry no acquisition signal: mid-session pageviews are
// 'Direct' (self-referrer cleared before getChannel) or 'Internal' (same-site
// referrer that survived clearing, e.g. www variants). '' guards legacy rows.
const UNATTRIBUTED_CHANNELS = "('Direct', 'Internal', '')";

// First attributed channel in the session, falling back to the first event's
// channel when no event in the session carries an acquisition signal.
export const SESSION_CHANNEL_AGG = `if(countIf(channel NOT IN ${UNATTRIBUTED_CHANNELS}) > 0, argMinIf(channel, timestamp, channel NOT IN ${UNATTRIBUTED_CHANNELS}), argMin(channel, timestamp))`;
