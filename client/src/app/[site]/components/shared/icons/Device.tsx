import { Gamepad2, Glasses, Laptop, Smartphone, Tablet, Tv, Watch } from "lucide-react";

export function DeviceIcon({ deviceType, size = 16 }: { deviceType?: string; size?: number }) {
    const type = deviceType?.toLowerCase() || "";

    if (type.includes("mobile")) {
        return <Smartphone width={size} height={size} />;
    }
    if (type.includes("tablet")) {
        return <Tablet width={size} height={size} />;
    }
    if (type === "tv") {
        return <Tv width={size} height={size} />;
    }
    if (type === "console") {
        return <Gamepad2 width={size} height={size} />;
    }
    if (type === "wearable") {
        return <Watch width={size} height={size} />;
    }
    if (type === "xr") {
        return <Glasses width={size} height={size} />;
    }

    return <Laptop width={size} height={size} />;
}
