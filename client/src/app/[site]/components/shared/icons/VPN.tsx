import { Shield } from "lucide-react";
import Image from "next/image";

const VPN_TO_LOGO: Record<string, string> = {
  AirVPN: "AirVPN.svg",
  NordVPN: "NordVPN.svg",
  Surfshark: "Surfshark.svg",
  ExpressVPN: "ExpressVPN.svg",
  "Private Internet Access": "PIA.svg",
  MullvadVPN: "Mullvad.svg",
  ProtonVPN: "ProtonVPN.svg",
};

export function VPN({ vpn = "" }: { vpn?: string }) {
  return (
    <>
      {VPN_TO_LOGO[vpn] ? (
        <Image src={`/vpns/${VPN_TO_LOGO[vpn]}`} alt={vpn || "Other"} className="w-4 h-4" width={16} height={16} />
      ) : (
        <Shield className="w-4 h-4" />
      )}
    </>
  );
}
