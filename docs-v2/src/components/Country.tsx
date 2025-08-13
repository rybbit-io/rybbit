import * as CountryFlags from "country-flag-icons/react/3x2";
import React from "react";

interface CountryFlagProps {
  country: string;
}

export function CountryFlag({ country }: CountryFlagProps) {
  const FlagComponent = (CountryFlags as Record<string, React.ComponentType<{ title?: string; className?: string }>>)[country];
  
  return (
    <>
      {FlagComponent
        ? React.createElement(
            FlagComponent,
            {
              title: country,
              className: "w-5",
            }
          )
        : null}
    </>
  );
}