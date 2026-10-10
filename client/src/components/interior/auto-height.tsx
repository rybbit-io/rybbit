// Adapted from interior.dev "Show More" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import {
  animate,
  type AnimationPlaybackControls,
  motionValue,
  useReducedMotion,
  type ValueAnimationTransition,
} from "framer-motion";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { SPRING_DISCLOSE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type AutoHeightProps = {
  children: ReactNode;
  transition?: ValueAnimationTransition<number>;
  className?: string;
  /** Classes for the measured box, e.g. padding, so focus rings sit inside the clip. */
  contentClassName?: string;
};

/**
 * Springs its height when its content grows or shrinks, so swapping or disclosing content morphs the
 * box in place instead of jumping the layout below it. At rest the height is auto; it is pinned in px
 * only while a spring runs, and under reduced motion it simply follows the content.
 *
 * The spring drives a standalone motion value that writes the style itself instead of a motion.div's
 * animate prop: a paint dropped by the render loop can then never leave content clipped.
 */
export function AutoHeight({ children, transition = SPRING_DISCLOSE, className, contentClassName }: AutoHeightProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const options = useRef({ transition, reduceMotion });

  useLayoutEffect(() => {
    options.current = { transition, reduceMotion };
  });

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content || typeof ResizeObserver === "undefined") return;

    // The content's height at rest, and the spring (if any) currently carrying the box towards it.
    let settled = content.offsetHeight;
    let spring: AnimationPlaybackControls | undefined;
    const height = motionValue(settled);
    const unsubscribe = height.on("change", value => {
      box.style.height = `${value}px`;
    });

    const sync = () => {
      const target = content.offsetHeight;
      if (target === settled) return;
      const from = spring ? height.get() : settled;
      spring?.stop();
      spring = undefined;
      settled = target;

      if (options.current.reduceMotion) {
        box.style.height = "";
        return;
      }
      // Pinned directly: jump() stays silent when the value hasn't moved, which it hasn't at rest.
      box.style.height = `${from}px`;
      height.jump(from);
      spring = animate(height, target, {
        ...options.current.transition,
        onComplete: () => {
          box.style.height = "";
          spring = undefined;
        },
      });
    };

    // React commits a swap or a disclosure as one batch of DOM mutations. Checking in the microtask
    // right after that commit pins the old height before anything can lay out or paint the new one.
    const mutations = new MutationObserver(sync);
    mutations.observe(content, { childList: true, subtree: true, characterData: true });
    // Everything else that resizes the content (fonts, images, reflow) is caught before paint here.
    const resizes = new ResizeObserver(sync);
    resizes.observe(content);

    return () => {
      mutations.disconnect();
      resizes.disconnect();
      spring?.stop();
      unsubscribe();
    };
  }, []);

  return (
    <div ref={boxRef} className={cn("overflow-hidden", className)}>
      <div ref={contentRef} className={contentClassName}>
        {children}
      </div>
    </div>
  );
}
