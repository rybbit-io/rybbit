import { Bug } from "lucide-react";
import Image from "next/image";

const CRAWLER_TO_LOGO: Record<string, string> = {
  AhrefsBot: "Ahrefs.svg",
  BingBot: "Bing.svg",
  GoogleBot: "Google.svg",
  YandexBot: "Yandex.svg",
  Applebot: "Apple.svg",
  DuckDuckGoBot: "DuckDuckGo.svg",
  ByteSpider: "TikTok.svg",
  Baiduspider: "Baidu.svg",
  Twitterbot: "Twitter.svg",
};

export function Crawler({ crawler = "" }: { crawler?: string }) {
  return (
    <>
      {CRAWLER_TO_LOGO[crawler] ? (
        <Image
          src={`/crawlers/${CRAWLER_TO_LOGO[crawler]}`}
          alt={crawler || "Other"}
          className="w-4 h-4"
          width={16}
          height={16}
        />
      ) : (
        <Bug className="w-4 h-4" />
      )}
    </>
  );
}
