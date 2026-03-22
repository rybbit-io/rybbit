import { Laptop, Smartphone } from "lucide-react";

export function DeviceIcon({ deviceType, size = 16 }: { deviceType?: string; size?: number }) {
    const type = deviceType?.toLowerCase() || "";

    if (type.includes("mobile") || type.includes("tablet")) {
        return <Smartphone width={size} height={size} />;
    }

    return <Laptop width={size} height={size} />;
}