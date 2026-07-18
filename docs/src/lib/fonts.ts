import { Tilt_Warp } from "next/font/google";

// Shared display typeface for marketing headlines (hero + section headings).
// Import from here so every heading renders the same font instance.
export const displayFont = Tilt_Warp({
  subsets: ["latin"],
});
