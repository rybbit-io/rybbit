import { useEffect, useRef, useState } from "react";

interface UseInViewOptions extends IntersectionObserverInit {
  /**
   * Once an element has been seen, keep it as "in view" to prevent
   * flickering when scrolling in and out quickly
   */
  persistVisibility?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(options?: UseInViewOptions) {
  const { persistVisibility = true, ...observerOptions } = options || {};
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const wasPreviouslyVisible = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Always update state when entering viewport
        setIsInView(true);
        wasPreviouslyVisible.current = true;
      } else if (!persistVisibility || !wasPreviouslyVisible.current) {
        // Only update state when leaving viewport if we're not persisting visibility
        // or if we haven't been visible before
        setIsInView(false);
      }
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [observerOptions, persistVisibility]);

  return { ref, isInView };
}
