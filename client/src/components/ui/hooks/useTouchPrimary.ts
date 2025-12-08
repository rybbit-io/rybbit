import { useEffect, useState } from "react";

export function useTouchPrimary() {
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const controller = new AbortController();
    const { signal } = controller;

    const handleTouch = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const prefersTouch = window.matchMedia("(pointer: coarse)").matches;
      setIsTouchPrimary(hasTouch && prefersTouch);
    };

    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", handleTouch, { signal });
    window.addEventListener("pointerdown", handleTouch, { signal });

    handleTouch();

    return () => controller.abort();
  }, []);

  return isTouchPrimary;
}
