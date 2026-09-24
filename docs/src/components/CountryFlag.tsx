import * as CountryFlags from "country-flag-icons/react/3x2";
import React from "react";

export function CountryFlag({
  country,
  className,
}: {
  country: string;
  className?: string;
}) {
  const Flag = CountryFlags[country as keyof typeof CountryFlags];
  return Flag ? <Flag className={className ?? "w-5"} /> : null;
}
