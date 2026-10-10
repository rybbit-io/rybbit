import { Gamepad2, Glasses, Laptop, Smartphone, Tablet, Tv, Watch } from "lucide-react";

export function getDeviceIconComponent(deviceType?: string) {
    const type = deviceType?.toLowerCase() || "";

    if (type.includes("mobile")) return Smartphone;
    if (type.includes("tablet")) return Tablet;
    if (type === "tv") return Tv;
    if (type === "console") return Gamepad2;
    if (type === "wearable") return Watch;
    if (type === "xr") return Glasses;
    return Laptop;
}

export function DeviceIcon({ deviceType, size = 16 }: { deviceType?: string; size?: number }) {
    const Icon = getDeviceIconComponent(deviceType);
    return <Icon width={size} height={size} />;
}
