import { Compass } from "lucide-react";
import Image from "next/image";

const BROWSER_TO_LOGO: Record<string, string> = {
  Chrome: "Chrome.svg",
  "Mobile Chrome": "Chrome.svg",
  "Chrome WebView": "Chrome.svg",
  "Chrome Headless": "Chromium.svg",
  Chromium: "Chromium.svg",
  GSA: "Chromium.svg",
  Firefox: "Firefox.svg",
  "Firefox Focus": "Firefox.svg",
  "Mobile Firefox": "Firefox.svg",
  Mozilla: "Firefox.svg",
  Safari: "Safari.svg",
  "Mobile Safari": "Safari.svg",
  Edge: "Edge.svg",
  Opera: "Opera.svg",
  "Opera Touch": "Opera.svg",
  "Opera GX": "OperaGX.svg",
  "Samsung Internet": "SamsungInternet.svg",
  Yandex: "Yandex.svg",
  QQBrowser: "QQ.webp",
  Whale: "Whale.svg",
  Baidu: "Baidu.svg",
  WebKit: "WebKit.svg",
  DuckDuckGo: "DuckDuckGo.svg",
  Facebook: "Facebook.svg",
  "Sogou Explorer": "Sogou.png",
  "Avast Secure Browser": "Avast.png",
  NAVER: "Naver.webp",
  UCBrowser: "UCBrowser.svg",
  "Android Browser": "Android.svg",
  "AVG Secure Browser": "AVG.svg",
  "Smart Lenovo Browser": "Lenovo.png",
  "Vivo Browser": "Vivo.webp",
  Instagram: "Instagram.svg",
  Silk: "Silk.png",
  KAKAOTALK: "KAKAOTALK.svg",
  Iron: "Iron.png",
  Sleipnir: "Sleipnir.webp",
  HeyTap: "HeyTap.png",
  Line: "Line.svg",
  "Oculus Browser": "Oculus.svg",
  Wolvic: "Wolvic.png",
  "360": "360.png",
  PaleMoon: "PaleMoon.png",
  WeChat: "WeChat.svg",
  "Coc Coc": "CocCoc.svg",
  "Huawei Browser": "Huawei.svg",
  IE: "IE.svg",
  Quark: "Quark.svg",
  "MIUI Browser": "Miui.png",
  Brave: "Brave.svg",
  Debian: "Debian.svg",
  Ecosia: "Ecosia.svg",
  Electron: "Electron.svg",
  LibreWolf: "LibreWolf.svg",
  LinkedIn: "LinkedIn.svg",
  SeaMonkey: "SeaMonkey.svg",
  Snapchat: "Snapchat.svg",
  TikTok: "TikTok.svg",
  Twitter: "Twitter.svg",
  Waterfox: "Waterfox.svg",
};

export function Browser({ browser, size = 16 }: { browser: string; size?: number }) {
  return (
    <>
      {BROWSER_TO_LOGO[browser] ? (
        <Image src={`/browsers/${BROWSER_TO_LOGO[browser]}`} alt={browser || "Other"} width={size} height={size} />
      ) : (
        <Compass width={size} height={size} />
      )}
    </>
  );
}
