"use client";

import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface EarthIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EarthIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const CIRCLE_TRANSITION: Transition = {
  duration: 0.3,
  delay: 0.1,
  opacity: { delay: 0.15 },
};

const CIRCLE_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
  },
};

const EarthIcon = forwardRef<EarthIconHandle, EarthIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="M21.54 15H17a2 2 0 0 0-2 2v4.54"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
                pathOffset: 0,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                pathOffset: [1, 0],
              },
            }}
          />
          <motion.path
            animate={controls}
            d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
                pathOffset: 0,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                pathOffset: [1, 0],
              },
            }}
          />
          <motion.path
            animate={controls}
            d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: {
                pathLength: 1,
                opacity: 1,
                pathOffset: 0,
              },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                pathOffset: [1, 0],
              },
            }}
          />
          <motion.circle
            animate={controls}
            cx="12"
            cy="12"
            r="10"
            transition={CIRCLE_TRANSITION}
            variants={CIRCLE_VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

EarthIcon.displayName = "EarthIcon";

export { EarthIcon };
