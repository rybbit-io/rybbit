import * as CountryFlags from "country-flag-icons/react/3x2";
import React from "react";
import { getCountryName } from "../../../../../lib/utils";
import { cn } from "@/lib/utils";

export function CountryFlag({ country, className }: { country: string; className?: string }) {
  return (
    <>
      {CountryFlags[country as keyof typeof CountryFlags]
        ? React.createElement(CountryFlags[country as keyof typeof CountryFlags], {
            title: getCountryName(country),
            className: cn("w-5", className),
          })
        : null}
    </>
  );
}
