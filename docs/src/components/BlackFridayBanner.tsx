"use client";

import { useEffect, useState } from "react";

export function BlackFridayBanner() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Set end date to December 1, 2025, 11:59:59 PM PST
    const endDate = new Date("2025-12-01T23:59:59-08:00");

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isExpired) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-center px-2 py-1 bg-emerald-300 dark:bg-emerald-600">
      <span className="font-semibold text-xs sm:text-sm">Black Friday Sale: 50% off first month!</span>
      <span className="text-[11px] sm:text-xs opacity-90">
        Code: <span className="font-mono font-bold">BLACKFRIDAY</span>
      </span>
      <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
        <span className="opacity-90">Ends in:</span>
        <div className="flex gap-1 font-mono font-semibold">
          {timeLeft.days > 0 && (
            <>
              <span>{timeLeft.days}d</span>
              <span>:</span>
            </>
          )}
          <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
          <span>:</span>
          <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
          <span>:</span>
          <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
        </div>
      </div>
    </div>
  );
}
