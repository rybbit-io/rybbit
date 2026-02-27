import { unstable_extractMessages } from "next-intl/extractor";

await unstable_extractMessages({
  srcPath: "./src",
  sourceLocale: "en",
  messages: {
    path: "./messages",
    format: "json",
    locales: ["en", "de", "fr", "zh", "es", "pl", "it", "ko", "pt", "ja"],
  },
});
