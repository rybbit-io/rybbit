# Ported micro-interactions

Components and hooks adapted from interior.dev and Beautiful UI (both MIT, see `THIRD_PARTY_LICENSES.md`).

- **Port the logic, not the markup.** Keep the hook, state machine, timings and a11y wiring. Render through Rybbit primitives (`Button`, Radix, `cn()`) and restyle to `DESIGN.md` tokens: neutral ramp, emerald only for action or success, radii ≤ 4.8px, no resting shadows.
- **Motion:** import from `"framer-motion"`, never `"motion/react"`, and take springs, easings and fades from `@/lib/motion`. `<MotionConfig reducedMotion="user">` covers framer animations; never branch DOM structure on `useReducedMotion()`.
- **Keep Radix for overlays** (dialogs, popovers, menus, tooltips). Borrow upstream spring values, not the components.
- **Localize every string**, including aria-labels and sr-only announcements, with `useExtracted()`, and format numbers for the active locale.
- **Header comment** on the first line of each ported file: `// Adapted from interior.dev "<Component>" (MIT). See ./THIRD_PARTY_LICENSES.md` (or `Beautiful UI "<Component>"`).
- **Never install with the shadcn CLI.** Registry items declare the `motion` package, which would add a second copy of framer-motion.
