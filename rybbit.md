Rybbit is an AGPL v3 open source web and product analytics platform. 8000+ stars and launched

## Tech stack

Modern tech stack with full stack typescript (Next.js/fastify) + clickhouse

## Features it has

- general web analytics dashboard - very similar to plausibe/umami main dashboard with a top section with overview data and chart and cards for devices, browsers, os, pages, location, referrers, utm, events etc...
- realtime globe view - similar to the google analytics realtime page but with a 3d globe (more of a fun feature)
- geolocation support with nation/top level subdivision/city with map that actually shows the subdivisons
- support for custom events with attributes
- web vitals dashboard that has chart as well as breakdown by page and region
- sessions page with list of all sessions and the pageview + events of each session
- users page and user profiles page that shows info about each user and their session history
- page dedicated to conversion goals
- page dedicated to funnels
- page for user journeys sankey
- user profiles
- session replays, but with less supporting features than full on session replay oriented tools
- browser error tracking page (this is one of the less useful features since no support for sourcemaps yet)
- ability to make analytics public
- basic bot traffic blocking
- full support for organizations

## Pricing

Free - 10k events per month with only main dashboard
$19/m - $249/m - 100k to 10m event limit with more team members, more websites and almost every other features except for session replay. 2 years data retention
$39/m+ - $499/m - 100k to 10m event limit with unlimited team members, websites, and session replay. 5+ year retention

On the self hosted version, almost everything is available for free

## Privacy positioning

Rybbit has largely the same privacy positioning as other privacy friendly GA alternatives like plausible, simpleanalytics, and fathom. It identifies users with useragent+IP hash and has a daily rotating salt that can be turned on. We mention it, but our marketing is a lot less reliant on it. This is because being explicity privacy focused limits the types of features we can add in the future.

## General positioning

Web analytics is quite crowded. One one side you have complex enterprise platforms like GA, posthog, statsig, mixpanel, amplitude. And on the other side you have simple privacy friendly alternatives like plausible, umami, fathom.

Rybbit basically tries to fill a gap in between the two - much easier to use than enterprise platforms but more powerful than the simple privacy focused ones. It's probably still closer to the latter group since our product analytics capabilities are nowhere near that of mixpanel or amplitude yet.

Rybbit has a lot of features, but none of them are super complicated which means everything mostly works out of the box. The upside is that there is no friction to use features, but the downside is that for some people with advanced product analytics requirements rybbit is not configurable enough. Currently there are no support for custom dashboards or a/b testing.

So our target audience is basically is people who would plausible/umami/GA/cloudflare for general tracking as well as people that probably won't go through the trouble of setting up complex product analytics workflows on mixppanel or amplitude.

## Strengths and weaknesses

- probably the prettiest UI of all these platforms. this is definitely the best part about rybbit
- has far more features than plausibe/umami/fathom/simpleanalytics without being any harder to use
- depth of features is lower than full fledged enterprise product analytics platforms
- much easiser to self host than posthog or sentry, but probably a bit harder to self host than umami or plausible
- default script size is 18kb unzipped which is bigger than privacy friendly platforms, but sitll a lot smaller than GA
- no way to import data from other platforms yet
- should be a lot less prone to adblockers
- boostrapped by solofounder (could be strength or weakness)
- no whitelabeling or theming yet
- open source and self-hostable
- very modern (launched in early 2025)
- has live demo on real data
- no email reports yet
- for cloud version data is stored in EU hetzner server but the actual company is american
