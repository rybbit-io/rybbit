import * as React from "react";

export interface PageProps {
  children: React.ReactNode;
  isLastPage?: boolean;
}

export const Page = ({ children, isLastPage }: PageProps) => (
  <div className={isLastPage ? "page page-last" : "page"}>{children}</div>
);

export interface TwoColumnRowProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export const TwoColumnRow = ({ left, right }: TwoColumnRowProps) => (
  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
    {left}
    {right}
  </div>
);
