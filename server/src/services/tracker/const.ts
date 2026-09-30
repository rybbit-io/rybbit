import { AI_CHAT_DOMAINS } from "@rybbit/shared";

const searchDomains = [
  // Google and variants
  "google.com",
  "google.",

  // Bing
  "bing.com",
  "bing.",

  // Yahoo
  "yahoo.com",
  "yahoo.",
  "search.yahoo.",

  // Other global search engines
  "duckduckgo.com",
  "duck.com",
  "baidu.com",
  "baidu.",
  "yandex.com",
  "yandex.",
  "ya.ru",
  "qwant.com",
  "search.",
  "ecosia.org",
  "search.brave.com",
  "startpage.com",
  "searchencrypt.com",
  "searx.",
  "swisscows.com",
  "mojeek.com",
  "gibiru.com",
  "metager.org",
  "search.aol.com",
  "lycos.com",
  "wolframalpha.com",
  "ask.com",
  "dogpile.com",
  "webcrawler.com",

  // Regional search engines
  "naver.com",
  "daum.net",
  "seznam.cz",
  "coccoc.com",
  "yam.com",
  "so.com",
  "sogou.com",
  "goo.ne.jp",
  "rambler.ru",
  "sm.cn",
  "petalsearch.com",

  // Other search engines
  "kagi.com",
  "presearch.com",
];

const socialDomains = [
  // Major social networks and their variants
  "facebook.com",
  "fb.com",
  "fb.me",
  "messenger.com",
  "m.facebook.com",
  "instagram.com",
  "instagram.",
  "ig.me",
  "twitter.com",
  "t.co",
  "x.com",
  "linkedin.com",
  "lnkd.in",
  "tiktok.com",
  "tiktok.",
  "vm.tiktok.com",
  "pinterest.com",
  "pinterest.",
  "pin.it",
  "reddit.com",
  "redd.it",
  "old.reddit.com",

  // Other global social platforms
  "snapchat.com",
  "snap.com",
  "discord.com",
  "discord.gg",
  "whatsapp.com",
  "wa.me",
  "telegram.org",
  "t.me",
  "medium.com",
  "tumblr.com",
  "tmblr.co",
  "quora.com",
  "threads.net",
  "threads.com",
  "mastodon.social",
  "mastodon.",
  "mstdn.",
  "mas.to",
  "fosstodon.org",
  "hachyderm.io",
  "infosec.exchange",
  "slack.com",
  "nextdoor.com",
  "clubhouse.com",
  "news.ycombinator.com",
  "hn.algolia.com",

  // Newer/emerging platforms
  "bluesky.app",
  "bsky.app",
  "farcaster.xyz",
  "warpcast.com",
  "lobste.rs",
  "truth.social",
  "truthsocial.com",
  "gettr.com",
  "parler.com",
  "gab.com",
  "minds.com",
  "diaspora.",
  "lemmy.",
  "bereal.com",
  "vsco.co",
  "flickr.com",
  "flic.kr",
  "500px.com",
  "deviantart.com",
  "behance.net",
  "dribbble.com",

  // Professional networks
  "xing.com",
  "viadeo.com",
  "meetup.com",

  // Regional social platforms
  "wechat.com",
  "weixin.qq.com",
  "vk.com",
  "qq.com",
  "weibo.com",
  "weibo.cn",
  "xiaohongshu.com",
  "xhslink.com",
  "douyin.com",
  "zhihu.com",
  "tieba.baidu.com",
  "line.me",
  "kakaotalk.com",
  "viber.com",
  "ok.ru",
  "odnoklassniki.ru",
];

const videoDomains = [
  // Major video platforms
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "twitch.tv",
  "dailymotion.com",

  // Streaming services
  "netflix.com",
  "disneyplus.com",
  "hulu.com",
  "hbomax.com",
  "max.com",
  "peacocktv.com",
  "primevideo.com",
  "paramountplus.com",
  "discoveryplus.com",
  "crunchyroll.com",
  "curiositystream.com",
  "mubi.com",
  "appletv.com",
  "tv.apple.com",

  // Video sharing
  "vevo.com",
  "streamable.com",
  "bitchute.com",
  "rumble.com",
  "odysee.com",
  "reels.instagram.com",

  // Educational
  "ted.com",
  "khanacademy.org",
  "skillshare.com",
  "udemy.com",
  "masterclass.com",
  "coursera.org",
  "pluralsight.com",

  // Live streaming
  "kick.com",

  // Regional platforms
  "bilibili.com",
  "niconico.jp",
  "youku.com",
  "tudou.com",
  "iqiyi.com",

  // Short-form video
  "triller.co",
  "likee.video",
];

const shoppingDomains = [
  // Major marketplaces
  "amazon.com",
  "amazon.",
  "ebay.com",
  "ebay.",
  "etsy.com",
  "walmart.com",
  "target.com",
  "aliexpress.com",
  "wish.com",
  "shopify.com",
  "shop.app",

  // Fashion and apparel
  "asos.com",
  "zara.com",
  "forever21.com",
  "hm.com",
  "gap.com",
  "macys.com",
  "nordstrom.com",
  "net-a-porter.com",
  "farfetch.com",
  "fashionnova.com",
  "shein.com",
  "romwe.com",
  "zaful.com",
  "boohoo.com",
  "prettylittlething.com",

  // Electronics
  "bestbuy.com",
  "newegg.com",
  "bhphotovideo.com",
  "microcenter.com",
  "tigerdirect.com",

  // Home and furniture
  "wayfair.com",
  "ikea.com",
  "homedepot.com",
  "lowes.com",
  "overstock.com",
  "cb2.com",
  "crateandbarrel.com",
  "westelm.com",

  // Regional marketplaces
  "taobao.com",
  "jd.com",
  "rakuten.com",
  "flipkart.com",
  "lazada.com",
  "mercadolibre.com",
  "ozon.ru",
  "allegro.pl",
  "coupang.com",
  "gmarket.co.kr",
  "shopee.com",
  "tokopedia.com",
  "bukalapak.com",

  // Grocery and food
  "instacart.com",
  "freshdirect.com",
  "ocado.com",
  "groceries.",
  "doordash.com",
  "ubereats.com",
  "grubhub.com",
  "deliveroo.com",
  "postmates.com",
  "seamless.com",
  "foodpanda.com",
];

// AI chat domains. Sourced from shared/ so that channel classification and the
// bots dashboard's crawl-vs-referral comparison cannot drift apart — the
// dashboard has to spell an operator's name the same way the bot patterns do.
const aiChatDomains = AI_CHAT_DOMAINS;

// Webmail. More specific than the search entries they sit under ("google.",
// "yahoo."), so a click from an inbox is Email rather than Organic Search.
const emailDomains = [
  "mail.google.com",
  "inbox.google.com",
  "com.google.android.gm", // Gmail app, via android-app:// referrers
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.cloud.microsoft",
  "mail.yahoo.com",
  "mail.yahoo.co.jp",
  "mail.aol.com",
  "mail.proton.me",
  "mail.protonmail.com",
  "app.fastmail.com",
  "app.hey.com",
  "mail.superhuman.com",
  "mail.zoho.com",
  "mail.zoho.eu",
  "mail.yandex.ru",
  "mail.yandex.com",
  "e.mail.ru",
  "mail.qq.com",
  "mail.163.com",
  "mail.126.com",
  "mail.naver.com",
  "mail.daum.net",
  "email.seznam.cz",
  "webmail.",
];

// Hosts under a search engine's domain that are products, not search results.
// Listing them here stops "google." from claiming them as Organic Search.
const nonSearchDomains = [
  "accounts.google.com",
  "docs.google.com",
  "drive.google.com",
  "sites.google.com",
  "calendar.google.com",
  "classroom.google.com",
  "meet.google.com",
  "translate.google.com",
];

// AI chat sources (utm_source values)
const aiChatSources = [
  "chatgpt",
  "openai",
  "claude",
  "anthropic",
  "gemini",
  "copilot",
  "deepseek",
  "mistral",
  "meta ai",
  "metaai",
  "poe",
  "grok",
  "pi",
  "huggingchat",
  "cohere",
  "character.ai",
  "qwen",
  "jasper",
  "writesonic",
  "chatsonic",
  "perplexity",
  "phind",
  "andi",
  "you",
  "cursor",
  "codeium",
  "windsurf",
  "lechat",
];

// AI chat mediums (utm_medium values)
const aiChatMediums = [
  "ai",
  "ai-chat",
  "chatbot",
  "llm",
  "ai-assistant",
  "gen-ai",
  "ai-search",
];

// AI chat mobile app IDs
export const aiChatAppIds = [
  "com.openai.chatgpt",
  "com.anthropic.claude",
  "com.google.android.apps.bard",
  "com.microsoft.copilot",
  "ai.perplexity.app.android",
  "ai.perplexity.app.ios",
  "com.quora.poe",
  "ai.character.app",
  "com.deepseek.chat",
];

// Define sources types
const searchSources = [
  // Major search engines
  "google",
  "bing",
  "yahoo",
  "duckduckgo",
  "baidu",
  "yandex",
  "qwant",

  // Other search engines
  "ecosia",
  "brave",
  "startpage",
  "searchencrypt",
  "swisscows",
  "mojeek",
  "gibiru",
  "metager",
  "wolframalpha",
  "ask",
  "dogpile",
  "webcrawler",
  "aol",

  // Regional search engines
  "naver",
  "daum",
  "seznam",
  "coccoc",
  "yam",
  "so",
  "sogou",
  "goo",
  "rambler",

  // Other search engines
  "kagi",
];

const socialSources = [
  // Major social platforms
  "facebook",
  "twitter",
  "x",
  "linkedin",
  "instagram",
  "tiktok",
  "pinterest",
  "reddit",

  // Other platforms
  "snapchat",
  "discord",
  "whatsapp",
  "telegram",
  "medium",
  "tumblr",
  "quora",
  "threads",
  "mastodon",
  "slack",
  "nextdoor",
  "clubhouse",
  "hacker news",
  "hackernews",
  "ycombinator",

  // Shortened variants
  "fb",
  "ig",
  "pin",
  "li",
  "tw",

  // Meta ads {{site_source_name}} values (fb and ig are above)
  "meta",
  "msg",
  "an",

  // Newer/emerging platforms
  "bluesky",
  "bsky",
  "farcaster",
  "lobsters",
  "truth social",
  "gettr",
  "parler",
  "gab",
  "minds",
  "diaspora",
  "lemmy",
  "kbin",
  "bereal",
  "vsco",
  "flickr",
  "500px",
  "deviantart",
  "behance",
  "dribbble",

  // Professional networks
  "xing",
  "viadeo",
  "meetup",

  // Regional platforms
  "wechat",
  "weixin",
  "vk",
  "qq",
  "weibo",
  "xiaohongshu",
  "rednote",
  "douyin",
  "zhihu",
  "line",
  "kakao",
  "kakaotalk",
  "viber",
  "ok",
  "odnoklassniki",
];

const videoSources = [
  // Major video platforms
  "youtube",
  "yt",
  "vimeo",
  "twitch",
  "dailymotion",
  "tiktok",

  // Streaming services
  "disneyplus",
  "netflix",
  "hulu",
  "hbomax",
  "max",
  "peacock",
  "prime video",
  "paramount+",
  "discovery+",
  "crunchyroll",
  "curiositystream",
  "mubi",
  "apple tv",
  "appletv",

  // Video sharing
  "vevo",
  "streamable",
  "bitchute",
  "rumble",
  "odysee",
  "reels",

  // Educational
  "ted",
  "khanacademy",
  "skillshare",
  "udemy",
  "masterclass",
  "coursera",
  "pluralsight",

  // Live streaming
  "kick",

  // Regional platforms
  "bilibili",
  "niconico",
  "youku",
  "tudou",
  "iqiyi",

  // Short-form video
  "triller",
  "likee",
];

const shoppingSources = [
  // Major marketplaces
  "amazon",
  "ebay",
  "etsy",
  "shopify",
  "walmart",
  "target",
  "aliexpress",
  "wish",
  "shop",
  "store",
  "shopping",

  // Fashion and apparel
  "asos",
  "zara",
  "forever21",
  "hm",
  "gap",
  "macys",
  "nordstrom",
  "net-a-porter",
  "farfetch",
  "fashionnova",
  "shein",
  "romwe",
  "zaful",
  "boohoo",
  "prettylittlething",

  // Electronics
  "bestbuy",
  "newegg",
  "bhphotovideo",
  "apple",
  "samsung",
  "microcenter",
  "tigerdirect",

  // Home and furniture
  "wayfair",
  "ikea",
  "homedepot",
  "lowes",
  "overstock",
  "cb2",
  "crateandbarrel",
  "westelm",

  // Regional marketplaces
  "taobao",
  "jd",
  "rakuten",
  "flipkart",
  "lazada",
  "mercadolibre",
  "ozon",
  "allegro",
  "coupang",
  "gmarket",
  "shopee",
  "tokopedia",
  "bukalapak",

  // Grocery and food
  "instacart",
  "freshdirect",
  "ocado",
  "groceries",
  "doordash",
  "ubereats",
  "grubhub",
  "deliveroo",
  "postmates",
  "seamless",
  "foodpanda",
];

const emailSources = [
  "email",
  "e_mail",
  "e-mail",
  "mail",
  "newsletter",
  "mailchimp",
  "campaign-archive",
  "sendgrid",
  "mailgun",
  "constantcontact",
  "klaviyo",
  "hubspot",
  "marketo",
  "brevo",
  "sendinblue",
  "getresponse",
  "activecampaign",
  "mailerlite",
  "convertkit",
  "drip",
  "gmail",
  "yahoo",
  "outlook",
  "hotmail",
  "list",
  "blast",
  "campaign",
];

const smsSources = ["sms", "text", "twilio", "message", "whatsapp", "viber", "line", "imessage"];

// Medium types
const socialMediums = [
  "sm",
  "social-media",
  "social-network",
  "social",
  "community",
  "forum",
  "organic-social",
  "feed",
  "share",
  "repost",
  "tweet",
  "post",
  "update",
  "engagement",
  "ugc",
  "user-generated",
  "social_post",
];

const videoMediums = [
  "video",
  "youtube",
  "vimeo",
  "streaming",
  "live",
  "tv",
  "ott",
  "broadcast",
  "clip",
  "trailer",
  "episode",
  "series",
  "documentary",
  "film",
  "movie",
  "animation",
  "video_ad",
  "pre-roll",
  "mid-roll",
  "post-roll",
];

const displayMediums = [
  "display",
  "interstitial",
  "banner",
  "ad",
  "advert",
  "advertisement",
  "rich-media",
  "popup",
  "popunder",
  "overlay",
  "expandable",
  "floating",
  "skin",
  "wallpaper",
  "native",
  "programmatic",
  "dsp",
  "retargeting",
  "remarketing",
  "impression",
];

const affiliateMediums = [
  "affiliate",
  "aff",
  "partner",
  "partnership",
  "commission",
  "rev-share",
  "performance",
  "cpa",
  "lead-gen",
  "lead-generation",
];

const referralMediums = [
  "referral",
  "link",
  "app",
  "invite",
  "recommendation",
  "advocate",
  "refer-a-friend",
  "share",
  "web",
  "embed",
  "backlink",
  "qr",
  "qr-code",
  "deeplink",
  "vanity-url",
];

const emailMediums = [
  "email",
  "e_mail",
  "e-mail",
  "mail",
  "newsletter",
  "digest",
  "bulletin",
  "marketing_email",
  "promotional",
  "transactional",
  "notification_email",
  "alert",
  "confirmation",
  "update",
  "news",
];

const pushMediums = [
  "push",
  "notification",
  "mobile",
  "app-notification",
  "web-notification",
  "browser-notification",
  "alert",
  "toast",
  "prompt",
  "pwa",
  "install",
];

const audioMediums = [
  "audio",
  "podcast",
  "radio",
  "broadcast",
  "streaming",
  "music",
  "playlist",
  "episode",
  "show",
  "airplay",
  "song",
  "track",
  "voice",
  "audio_ad",
  "spot",
  "jingle",
  "commercial",
];

// New medium categories for modern marketing
const influencerMediums = [
  "influencer",
  "creator",
  "sponsored",
  "collaboration",
  "brand-ambassador",
  "micro-influencer",
  "macro-influencer",
  "nano-influencer",
  "ugc-creator",
  "content-creator",
  "partnership",
  "endorsement",
];

const cpcMediums = [
  "cpc",
  "ppc",
  "paid-search",
  "search-ads",
  "google-ads",
  "bing-ads",
  "yahoo-ads",
  "adwords",
  "sem",
  "paid-click",
];

const cpmMediums = [
  "cpm",
  "display-ads",
  "banner-ads",
  "impression",
  "programmatic",
  "rtb",
  "dsp",
  "demand-side",
  "supply-side",
  "ad-exchange",
];

const contentMediums = [
  "content",
  "blog",
  "article",
  "guest-post",
  "editorial",
  "pr",
  "press-release",
  "news",
  "publication",
  "magazine",
  "journal",
  "whitepaper",
  "case-study",
  "resource",
];

const eventMediums = [
  "event",
  "conference",
  "webinar",
  "workshop",
  "seminar",
  "meetup",
  "trade-show",
  "expo",
  "summit",
  "networking",
  "live-event",
  "virtual-event",
];

// Mobile App IDs (reverse DNS format)
export const socialAppIds = [
  // Facebook family
  "com.facebook",
  "com.facebook.katana",
  "com.facebook.facebook",
  "com.facebook.messenger",
  "com.facebook.orca",

  // Instagram
  "com.instagram",
  "com.instagram.android",
  "com.burbn.instagram",

  // Twitter/X
  "com.twitter",
  "com.twitter.android",
  "com.atebits.tweetie2",

  // TikTok
  "com.zhiliaoapp.musically",
  "com.tiktok",

  // Snapchat
  "com.snapchat",
  "com.snapchat.android",
  "com.toyopagroup.picaboo",

  // LinkedIn
  "com.linkedin",
  "com.linkedin.android",
  "com.linkedin.LinkedIn",

  // Pinterest
  "com.pinterest",

  // Reddit
  "com.reddit",
  "com.reddit.frontpage",
  "com.reddit.reddit",

  // Discord
  "com.discord",
  "com.hammerandchisel.discord",

  // Telegram
  "org.telegram",
  "org.telegram.messenger",
  "ph.telegra.Telegraph",

  // WhatsApp
  "com.whatsapp",

  // Threads
  "com.instagram.barcelona",
  "com.threads",

  // Bluesky
  "xyz.blueskyweb.app",

  // Mastodon
  "org.joinmastodon.android",

  // BeReal
  "com.bereal.ft",

  // VSCO
  "com.vsco.cam",

  // Other social
  "com.slack",
  "im.vector.app",
  "com.nextdoor",
  "com.clubhouse.app",
];

export const videoAppIds = [
  // YouTube
  "com.google.android.youtube",
  "com.google.ios.youtube",
  "com.google.ios.youtubekids",
  "com.google.android.apps.youtube.kids",
  "com.google.ios.youtubeunplugged",
  "com.google.android.youtube.tv",

  // Streaming services
  "com.netflix",
  "com.disney.disneyplus",
  "com.hulu",
  "com.hbo.hbonow",
  "com.hbo.hbomax",
  "com.peacocktv",
  "com.amazon.avod",
  "com.amazon.amazonvideo",
  "com.cbs.app",
  "com.paramountplus",

  // Twitch
  "tv.twitch",
  "tv.twitch.android.app",

  // Other video
  "com.vimeo",
  "com.dailymotion",
];

export const searchAppIds = [
  // Google
  "com.google.android.googlequicksearchbox",
  "com.google.android.websearch",

  // Bing
  "com.microsoft.bing",

  // Yahoo
  "com.yahoo.mobile.client.android.search",
  "com.yahoo.search",

  // DuckDuckGo
  "com.duckduckgo.mobile.android",
  "com.duckduckgo.mobile.ios",

  // Other search
  "com.ecosia.android",
  "com.brave.browser",
  "org.mozilla.firefox",
  "com.microsoft.emmx",
];

export const emailAppIds = [
  // Gmail
  "com.google.android.gm",
  "com.google.android.gm.lite",
  "com.google.Gmail",

  // Outlook
  "com.microsoft.office.outlook",
  "com.microsoft.outlooklite",
  "com.microsoft.Office.Outlook",

  // Yahoo Mail
  "com.yahoo.mobile.client.android.mail",
  "com.yahoo.Aerogram",

  // Apple Mail
  "com.apple.mobilemail",

  // ProtonMail
  "ch.protonmail.android",
  "ch.protonmail.protonmail",

  // Other mail apps
  "com.superhuman.mail",
  "com.superhuman.Superhuman",
  "com.samsung.android.email.provider",
  "me.bluemail.mail",
  "com.easilydo.mail",
  "org.kman.AquaMail",
  "com.aol.mobile.aolapp",
  "ru.mail.mailapp",
  "ru.mail.mail",
  "ru.yandex.mail",
  "com.pingapp.app",
  "com.readdle.smartemail",
];

export const shoppingAppIds = [
  // Amazon
  "com.amazon.mShop",
  "com.amazon.shopping",

  // eBay
  "com.ebay.mobile",

  // Walmart
  "com.walmart.android",

  // Target
  "com.target.ui",

  // Etsy
  "com.etsy.android",

  // Shopify
  "com.shopify.mobile",

  // Wish
  "com.contextlogic.wish",

  // AliExpress
  "com.alibaba.aliexpresshd",

  // Shein
  "com.zzkko",

  // Other shopping
  "com.wayfair.wayfair",
  "com.newegg.app",
  "com.bestbuy.android",
  "com.ikea.app",
  "com.homedepot",
  "com.lowes.android",
  "com.overstock",
];

// News and content app IDs
export const newsAppIds = [
  // Major news apps
  "com.cnn.mobile.android.phone",
  "com.foxnews.android",
  "com.nytimes.android",
  "com.washingtonpost.rainbow",
  "com.wsj.reader",
  "com.usatoday.android.news",
  "com.bbc.news",
  "com.reuters.android",
  "com.ap.mobile",
  "com.nbcuni.nbc",

  // Tech news
  "com.aol.mobile.techcrunch",
  "com.theverge.verge",
  "com.wired.android",
  "com.arstechnica.app",
  "com.engadget.android",

  // Aggregators
  "com.google.android.apps.magazines",
  "flipboard.app",
  "com.apple.news",
  "com.microsoft.amp.apps.bingnews",
];

// Productivity app IDs
export const productivityAppIds = [
  // Microsoft Office
  "com.microsoft.office.word",
  "com.microsoft.office.excel",
  "com.microsoft.office.powerpoint",
  "com.microsoft.teams",

  // Google Workspace
  "com.google.android.apps.docs",
  "com.google.android.apps.docs.editors.sheets",
  "com.google.android.apps.docs.editors.slides",
  "com.google.android.apps.meetings",

  // Note-taking
  "com.evernote",
  "us.zoom.videomeetings",
  "com.notion.id",
  "md.obsidian",
  "com.dropbox.android",
];

// Categorize mobile apps by their bundle ID/package name - helper function
export function isMobileAppId(source: string): boolean {
  // Check for common app identifier patterns (com.company.app, etc.)
  return /^[a-z0-9_]+(\.([a-z0-9_]+))+$/.test(source);
}

// Domain lists by source type. Order breaks ties between equally specific
// matches (AI before search, so an AI host under a search domain stays AI).
const domainSourceTypes: [string, string[]][] = [
  ["ai", aiChatDomains],
  ["email", emailDomains],
  ["referral", nonSearchDomains],
  ["search", searchDomains],
  ["social", socialDomains],
  ["video", videoDomains],
  ["shopping", shoppingDomains],
];

// How specifically `entry` matches `host`: the entry's length, or 0 for no
// match. A plain entry matches that domain and its subdomains ("facebook.com"
// matches "l.facebook.com" but not "notfacebook.com"). An entry ending in "."
// is a brand across TLDs and matches at a label boundary ("google." matches
// "google.de" and "www.google.co.uk" but not "googleusercontent.com").
function domainMatchLength(host: string, entry: string): number {
  if (entry.endsWith(".")) {
    return host.startsWith(entry) || host.includes("." + entry) ? entry.length : 0;
  }
  return host === entry || host.endsWith("." + entry) ? entry.length : 0;
}

// The most specific entry wins, so "mail.google.com" (email) beats "google."
// (search) and "tieba.baidu.com" (social) beats "baidu." (search).
// UTM sources are sometimes a URL ("https://facebook.com/", "//facebook.com")
// or a host with a path; referring domains arrive as bare hosts.
function getSourceHost(source: string): string {
  if (source.includes("//")) {
    try {
      return new URL(source.startsWith("//") ? `https:${source}` : source).hostname;
    } catch {
      // Not a URL: match the literal source
    }
  }
  return source.split(/[/?#]/)[0];
}

function getDomainSourceType(source: string): string | null {
  const host = getSourceHost(source);
  // A ".com" entry also covers its ".com.<country>" sites ("shopee.com" matches
  // "shopee.com.my"). Limited to ".com." so "pi.ai.uk" never becomes "pi.ai".
  const countrylessHost = /\.com\.[a-z]{2}$/.test(host) ? host.slice(0, -3) : "";

  let bestType: string | null = null;
  let bestLength = 0;
  for (const [type, domains] of domainSourceTypes) {
    for (const domain of domains) {
      const length = Math.max(
        domainMatchLength(host, domain),
        countrylessHost ? domainMatchLength(countrylessHost, domain) : 0,
      );
      if (length > bestLength) {
        bestType = type;
        bestLength = length;
      }
    }
  }
  return bestType;
}

// Helper function to categorize traffic source type
export function getSourceType(source: string): string {
  const lowerSource = source.toLowerCase();

  const domainSourceType = getDomainSourceType(lowerSource);
  if (domainSourceType) return domainSourceType;

  // Check source names (AI before search)
  if (aiChatSources.includes(lowerSource)) return "ai";
  if (searchSources.includes(lowerSource)) return "search";
  if (socialSources.includes(lowerSource)) return "social";
  if (videoSources.includes(lowerSource)) return "video";
  if (shoppingSources.includes(lowerSource)) return "shopping";
  if (emailSources.includes(lowerSource)) return "email";
  if (smsSources.includes(lowerSource)) return "sms";

  // Check mobile app IDs (AI before search)
  if (isMobileAppId(source)) {
    if (aiChatAppIds.includes(source)) return "ai";
    if (socialAppIds.includes(source)) return "social";
    if (videoAppIds.includes(source)) return "video";
    if (searchAppIds.includes(source)) return "search";
    if (emailAppIds.includes(source)) return "email";
    if (shoppingAppIds.includes(source)) return "shopping";
    if (newsAppIds.includes(source)) return "news";
    if (productivityAppIds.includes(source)) return "productivity";
    return "mobile-app";
  }

  return "direct";
}

// Helper function to categorize medium type
export function getMediumType(medium: string): string {
  const lowerMedium = medium.toLowerCase();

  if (aiChatMediums.includes(lowerMedium)) return "ai";
  if (socialMediums.includes(lowerMedium)) return "social";
  if (videoMediums.includes(lowerMedium)) return "video";
  if (displayMediums.includes(lowerMedium)) return "display";
  if (affiliateMediums.includes(lowerMedium)) return "affiliate";
  if (referralMediums.includes(lowerMedium)) return "referral";
  if (emailMediums.includes(lowerMedium)) return "email";
  if (pushMediums.includes(lowerMedium)) return "push";
  if (audioMediums.includes(lowerMedium)) return "audio";
  if (influencerMediums.includes(lowerMedium)) return "influencer";
  if (cpcMediums.includes(lowerMedium)) return "cpc";
  if (cpmMediums.includes(lowerMedium)) return "cpm";
  if (contentMediums.includes(lowerMedium)) return "content";
  if (eventMediums.includes(lowerMedium)) return "event";

  return "organic";
}

// Helper function to check if traffic is paid
export function isPaidTraffic(medium: string, source: string): boolean {
  const lowerMedium = medium.toLowerCase();
  const lowerSource = source.toLowerCase();

  // Paid medium indicators
  const paidMediums = [
    ...cpcMediums,
    ...cpmMediums,
    ...displayMediums,
    "paid",
    "ad",
    "ads",
    "advertising",
    "sponsored",
    "promotion",
  ];

  // Paid source indicators
  const paidSources = [
    "google ads",
    "googleads",
    "bing ads",
    "facebook ads",
    "instagram ads",
    "twitter ads",
    "linkedin ads",
    "tiktok ads",
    "youtube ads",
    "pinterest ads",
  ];

  return paidMediums.some(pm => lowerMedium.includes(pm)) || paidSources.some(ps => lowerSource.includes(ps));
}
