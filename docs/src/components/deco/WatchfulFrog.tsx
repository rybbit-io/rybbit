"use client";

import { useEffect, useRef } from "react";

// Geometry lifted from /public/rybbit/frog_white.svg (viewBox 263.33 × 173.53).
// Inlined instead of an <Image> so the eye can move: the ellipse sits inside
// the mark's carved socket, so a few units of travel read as a glance.
const EYE_CX = 105.94;
const EYE_CY = 28.62;
const VIEWBOX_WIDTH = 263.33;

/**
 * The watermark frog, awake. Its eye follows the cursor anywhere over the
 * enclosing <section>, and it blinks every few seconds (CSS, .frog-eye).
 * Static under prefers-reduced-motion and without a pointer; the resting
 * state is identical to the static SVG mark. Fill comes from currentColor.
 */
export function WatchfulFrog({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const eye = eyeRef.current;
    if (!svg || !eye) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = svg.closest("section");
    if (!section) return;

    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0) return;
        const scale = rect.width / VIEWBOX_WIDTH;
        const dx = event.clientX - (rect.left + EYE_CX * scale);
        const dy = event.clientY - (rect.top + EYE_CY * scale);
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        // Deflection caps at ~5 SVG units — enough to read as looking,
        // small enough to keep the pupil inside the carved socket.
        const reach = Math.min(1, dist / 160);
        eye.style.transform = `translate(${((dx / dist) * 5 * reach).toFixed(2)}px, ${((dy / dist) * 4 * reach).toFixed(2)}px)`;
      });
    };
    const onPointerLeave = () => {
      cancelAnimationFrame(frame);
      eye.style.transform = "";
    };

    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 263.33 173.53"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <polygon points="181.28 171.2 227.21 123.96 261.15 171.2 181.28 171.2" />
      <path d="M261.15,89.05L206.64,2.33l-33.22,17.75-34.61-7.4c2.88,5.56,4.56,12.11,4.56,19.15,0,20.03-13.46,36.26-30.06,36.26-13.66,0-25.17-11-28.83-26.06l-39.92,71.46L2.18,94.19l22.66,77.01h55.81l22.28-54.01v54.01h64.66l-49.95-82.15h143.51Z" />
      <g ref={eyeRef} style={{ transition: "transform 0.15s ease-out" }}>
        <ellipse className="frog-eye" cx={EYE_CX} cy={EYE_CY} rx={12.9} ry={18.88} />
      </g>
    </svg>
  );
}
