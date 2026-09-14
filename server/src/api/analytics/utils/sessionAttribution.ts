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

const sessionUtmAgg = (parameter: string, prefix?: string) => {
  const urlParameters = prefix ? `${prefix}.url_parameters` : "url_parameters";
  const timestamp = prefix ? `${prefix}.timestamp` : "timestamp";
  return `argMinIf(${urlParameters}['${parameter}'], ${timestamp}, ${urlParameters}['${parameter}'] != '')`;
};

// First non-empty UTM value in the session. argMin(url_parameters, timestamp)['utm_*']
// reads only the landing event's map; a heartbeat/custom event that lands first
// would hide UTM tags that appear on the first pageview and break goal filters.
export const SESSION_UTM_SOURCE_AGG = sessionUtmAgg("utm_source");
export const SESSION_UTM_MEDIUM_AGG = sessionUtmAgg("utm_medium");
export const SESSION_UTM_CAMPAIGN_AGG = sessionUtmAgg("utm_campaign");
export const SESSION_UTM_TERM_AGG = sessionUtmAgg("utm_term");
export const SESSION_UTM_CONTENT_AGG = sessionUtmAgg("utm_content");

export const SESSION_UTM_AGG_BY_PARAMETER: Record<string, string> = {
  utm_source: SESSION_UTM_SOURCE_AGG,
  utm_medium: SESSION_UTM_MEDIUM_AGG,
  utm_campaign: SESSION_UTM_CAMPAIGN_AGG,
  utm_term: SESSION_UTM_TERM_AGG,
  utm_content: SESSION_UTM_CONTENT_AGG,
};

export const goalSessionUtmAgg = (parameter: string) => sessionUtmAgg(parameter, "e");
