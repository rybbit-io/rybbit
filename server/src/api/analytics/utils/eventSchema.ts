// Leaf module: keep free of imports so the MCP tools and their tests can load
// the schema without dragging in the auth/OpenRouter dependency chain.
export const EVENT_SCHEMA = `
scoped_events columns:
- site_id UInt16: Numeric Rybbit site id. scoped_events is already limited to sites the user can access.
- timestamp DateTime: Event ingest time in ClickHouse. Use ClickHouse date functions such as toStartOfDay(timestamp).
- session_id String: Anonymous visit/session id. Use countDistinct(session_id) for sessions.
- user_id String: Anonymous device/user fingerprint id. This is not necessarily a logged-in app user id.
- identified_user_id String: Custom user id set via identify(); empty string when the visitor was not identified.
- hostname String: Page hostname without protocol, for example www.example.com.
- pathname String: URL path, usually starting with '/', for example /pricing. Hash-router paths may be normalized into this field.
- querystring String: Raw URL query string, usually including the leading '?', for example ?utm_source=google.
- url_parameters Map(String, String): Parsed query parameters keyed by lowercase parameter name. Common keys include utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, gad_source. Access with url_parameters['utm_source'].
- page_title String: document.title captured at event time; may be empty.
- referrer String: Full external referrer URL; empty for direct traffic and self-referrals.
- channel String: Derived acquisition channel. Expected values include Direct, Internal, Cross-Network, Paid AI, Paid Search, Paid Social, Paid Video, Paid Shopping, Display, Paid Influencer, Paid Audio, Paid Unknown, AI, Organic Search, Organic Social, Organic Video, Organic Shopping, Email, SMS, News, Productivity, Affiliate, Referral, Audio, Push, Influencer, Content, Event, Unknown.
- browser LowCardinality(String): Browser family from user-agent, for example Chrome, Safari, Firefox; may be empty.
- browser_version LowCardinality(String): Browser major version as a string, for example 124; may be empty.
- operating_system LowCardinality(String): OS family from user-agent, for example macOS, Windows, iOS, Android; may be empty.
- operating_system_version LowCardinality(String): OS version string from user-agent; may be empty.
- language LowCardinality(String): Browser language, usually a BCP 47 value like en-US; may be empty.
- country LowCardinality(FixedString(2)): ISO 3166-1 alpha-2 country code, for example US or GB; empty string when unknown.
- region LowCardinality(String): Region code, usually country-region like US-CA; empty string when unknown.
- city String: City name from IP geolocation; empty string when unknown.
- lat Float64: Latitude from IP geolocation; 0 when unknown.
- lon Float64: Longitude from IP geolocation; 0 when unknown.
- screen_width UInt16: Client screen width in pixels; 0 when unavailable.
- screen_height UInt16: Client screen height in pixels; 0 when unavailable.
- device_type LowCardinality(String): Derived device class. Expected values: Desktop, Mobile, Tablet, TV, Console, Embedded.
- type LowCardinality(String): Event kind. Valid values: pageview, custom_event, performance, outbound, error, button_click, copy, form_submit, input_change.
- event_name String: For custom_event this is the user-defined event name. For performance it is usually web-vitals. For error it is the error name, such as TypeError. Often empty for pageview, outbound, button_click, copy, form_submit, and input_change.
- props JSON: Event-specific JSON properties. For custom_event, arbitrary user properties. For outbound: url, text, target. For error: message, stack, fileName, lineNumber, columnNumber. For button_click: text plus data-rybbit-prop-* attributes. For copy: text, textLength, sourceElement. For form_submit: formId, formName, formAction, method, fieldCount, ariaLabel. For input_change: element, inputType, inputName, formId, formName. Use JSONExtractString(toString(props), 'key') for string properties.
- lcp Nullable(Float64): Largest Contentful Paint in milliseconds; only set on type = 'performance' web-vitals events.
- cls Nullable(Float64): Cumulative Layout Shift score; only set on type = 'performance' web-vitals events.
- inp Nullable(Float64): Interaction to Next Paint in milliseconds; only set on type = 'performance' web-vitals events.
- fcp Nullable(Float64): First Contentful Paint in milliseconds; only set on type = 'performance' web-vitals events.
- ttfb Nullable(Float64): Time to First Byte in milliseconds; only set on type = 'performance' web-vitals events.
- ip Nullable(String): Visitor IP address only when IP tracking is enabled for the site; otherwise null.
- timezone String: Visitor timezone from geolocation, usually an IANA timezone like America/New_York; empty when unknown.
- tag String: Optional site/script tag used to segment traffic; empty when unset.
- import_id Nullable(String): Import job id for rows loaded from imported analytics data; null for native Rybbit tracking.
`;
