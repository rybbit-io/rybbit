import { Compass } from "lucide-react";
import Image from "next/image";

const OS_TO_LOGO: Record<string, string> = {
  Windows: "Windows.svg",
  "Windows Phone": "Windows.svg",
  "Windows Mobile": "Windows.svg",
  "Windows RT": "Windows.svg",
  Android: "Android.svg",
  android: "Android.svg",
  "Android-x86": "Android.svg",
  Linux: "Tux.svg",
  Arch: "Tux.svg",
  CentOS: "Tux.svg",
  Gentoo: "Tux.svg",
  Kubuntu: "Tux.svg",
  Manjaro: "Tux.svg",
  Mint: "Tux.svg",
  openSUSE: "Tux.svg",
  RedHat: "Tux.svg",
  Slackware: "Tux.svg",
  SUSE: "Tux.svg",
  Xubuntu: "Tux.svg",
  macOS: "macOS.svg",
  iOS: "Apple.svg",
  "Chrome OS": "Chrome.svg",
  Chromecast: "Chrome.svg",
  "Chromecast Android": "Chrome.svg",
  "Chromecast Linux": "Chrome.svg",
  "Chromecast Fuchsia": "Chrome.svg",
  Ubuntu: "Ubuntu.svg",
  HarmonyOS: "HarmonyOS.svg",
  OpenHarmony: "OpenHarmony.png",
  PlayStation: "Playstation.svg",
  Tizen: "Tizen.png",
  Symbian: "Symbian.svg",
  Debian: "Debian.svg",
  Fedora: "Fedora.svg",
  Nintendo: "Nintendo.svg",
  Xbox: "Xbox.svg",
};

export function OperatingSystem({ os = "", size = 16 }: { os?: string; size?: number }) {
  return (
    <>
      {OS_TO_LOGO[os] ? (
        <Image src={`/operating-systems/${OS_TO_LOGO[os]}`} alt={os || "Other"} width={size} height={size} />
      ) : (
        <Compass width={size} height={size} />
      )}
    </>
  );
}
