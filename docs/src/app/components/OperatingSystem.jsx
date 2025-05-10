import { Compass } from "lucide-react";
import Image from "next/image";

const OS_TO_LOGO= {
  Windows: "Windows.svg",
  Android: "Android.svg",
  android: "Android.svg",
  Linux: "Tux.svg",
  macOS: "macOS.svg",
  iOS: "Apple.svg",
  "Chrome OS": "Chrome.svg",
  Ubuntu: "Ubuntu.svg",
  HarmonyOS: "HarmonyOS.svg",
  OpenHarmony: "OpenHarmony.png",
  PlayStation: "PlayStation.svg",
  Tizen: "Tizen.png",
};

export function OperatingSystem({ os = "" }) {
  /*
    In `os` variable we have something like "Windows (10)",
    so we need to get "Windows" only to get the logo.
  */
  const splittedLabel = os.split(" ");

  let logoKey = os
  
  if (splittedLabel.length > 1) {
    const elementsToJoin = splittedLabel.slice(0, -1);

    logoKey = elementsToJoin.join(" ");
  }
  
  const logo = OS_TO_LOGO[logoKey];  

  return (
    <>
      {logo ? (
        <Image
          src={`/operating-systems/${logo}`}
          alt={os || "Other"}
          className="w-4 h-4"
          width={16}
          height={16}
        />
      ) : (
        <Compass width={16} />
      )}
    </>
  );
}
