import type { Transition } from "framer-motion";

// Shared motion presets. The values follow interior.dev's conventions (MIT, see
// components/interior/THIRD_PARTY_LICENSES.md) so every animated component in
// the app moves the same way. Reduced motion is handled once, by the
// <MotionConfig reducedMotion="user"> in Providers: framer animations become
// instant, so components only branch *styles* on useReducedMotion(), never DOM
// structure (it returns null during SSR).

// Enters decelerate hard; exits accelerate and are shorter.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

// Label and icon swaps.
export const SPRING_CROSSFADE: Transition = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 };
// Thumbs, highlights, checks: anything that travels a short distance.
export const SPRING_CELL: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 };
// Chevrons, carets, chips.
export const SPRING_NUDGE: Transition = { type: "spring", stiffness: 700, damping: 46, mass: 0.5 };
// Height disclosure (accordions, expanding rows).
export const SPRING_DISCLOSE: Transition = { type: "spring", stiffness: 190, damping: 30, mass: 1 };
// Progress and share-bar fills.
export const SPRING_FILL: Transition = { type: "spring", stiffness: 210, damping: 34, mass: 0.9 };
// The only underdamped preset: a small celebratory pop.
export const SPRING_POP: Transition = { type: "spring", stiffness: 640, damping: 22, mass: 0.7 };
// Floating panels (pills, palettes).
export const SPRING_PANEL: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };

export const FADE_IN: Transition = { duration: 0.18, ease: EASE_OUT };
export const FADE_OUT: Transition = { duration: 0.14, ease: EASE_IN };
export const INSTANT: Transition = { duration: 0 };
