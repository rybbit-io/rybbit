/**
 * Set to true to disable origin checking for tracking requests
 * This should only be enabled in development or testing environments
 */
export const DISABLE_ORIGIN_CHECK = process.env.DISABLE_ORIGIN_CHECK === "true";

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
  "brave.com",
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

  // AI-powered search engines
  "perplexity.ai",
  "you.com",
  "phind.com",
  "andi.com",
  "neeva.com",
  "kagi.com",
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
  "youtube.com",
  "youtu.be",
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
  "mastodon.social",
  "mastodon.",
  "slack.com",
  "nextdoor.com",
  "clubhouse.com",
  "twitch.tv",
  "news.ycombinator.com",
  "hn.algolia.com",

  // Newer/emerging platforms
  "bluesky.app",
  "bsky.app",
  "post.news",
  "truth.social",
  "truthsocial.com",
  "gettr.com",
  "parler.com",
  "gab.com",
  "minds.com",
  "diaspora.",
  "lemmy.",
  "kbin.social",
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
  "amazon.com/prime-video",
  "paramountplus.com",
  "discoveryplus.com",
  "crunchyroll.com",
  "funimation.com",
  "curiositystream.com",
  "mubi.com",
  "appletv.com",
  "tv.apple.com",

  // Video sharing
  "tiktok.com",
  "vm.tiktok.com",
  "vevo.com",
  "streamable.com",
  "bitchute.com",
  "rumble.com",
  "odysee.com",
  "lbry.tv",
  "reels.instagram.com",

  // Educational
  "ted.com",
  "khanacademy.org",
  "skillshare.com",
  "udemy.com",
  "masterclass.com",
  "coursera.org",
  "pluralsight.com",
  "lynda.com",
  "linkedin.com/learning",

  // Live streaming
  "facebook.com/gaming",
  "youtube.com/live",
  "kick.com",
  "caffeine.tv",
  "mixer.com",

  // Regional platforms
  "bilibili.com",
  "niconico.jp",
  "vlive.tv",
  "youku.com",
  "tudou.com",
  "iqiyi.com",

  // Short-form video
  "vine.co",
  "byte.co",
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
  "apple.com/shop",
  "samsung.com/shop",
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

  // AI-powered search engines
  "perplexity",
  "you",
  "phind",
  "andi",
  "neeva",
  "kagi",
];

const socialSources = [
  // Major social platforms
  "facebook",
  "twitter",
  "linkedin",
  "instagram",
  "tiktok",
  "pinterest",
  "reddit",

  // Other platforms
  "snapchat",
  "youtube",
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
  "twitch",
  "hacker news",
  "hackernews",
  "ycombinator",

  // Shortened variants
  "fb",
  "ig",
  "pin",
  "li",
  "tw",
  "yt",

  // Newer/emerging platforms
  "bluesky",
  "bsky",
  "post",
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
  "funimation",
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
  "lbry",
  "reels",

  // Educational
  "ted",
  "khanacademy",
  "skillshare",
  "udemy",
  "masterclass",
  "coursera",
  "pluralsight",
  "lynda",

  // Live streaming
  "kick",
  "caffeine",
  "mixer",

  // Regional platforms
  "bilibili",
  "niconico",
  "vlive",
  "youku",
  "tudou",
  "iqiyi",

  // Short-form video
  "vine",
  "byte",
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

// Helper function to categorize traffic source type
export function getSourceType(source: string): string {
  const lowerSource = source.toLowerCase();

  // Check domains first
  if (searchDomains.some(domain => lowerSource.includes(domain))) return "search";
  if (socialDomains.some(domain => lowerSource.includes(domain))) return "social";
  if (videoDomains.some(domain => lowerSource.includes(domain))) return "video";
  if (shoppingDomains.some(domain => lowerSource.includes(domain))) return "shopping";

  // Check source names
  if (searchSources.includes(lowerSource)) return "search";
  if (socialSources.includes(lowerSource)) return "social";
  if (videoSources.includes(lowerSource)) return "video";
  if (shoppingSources.includes(lowerSource)) return "shopping";
  if (emailSources.includes(lowerSource)) return "email";
  if (smsSources.includes(lowerSource)) return "sms";

  // Check mobile app IDs
  if (isMobileAppId(source)) {
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
