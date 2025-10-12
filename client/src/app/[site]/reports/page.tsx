"use client";

import { useSetPageTitle } from "../../../hooks/useSetPageTitle";

export default function ReportsPage() {
  useSetPageTitle("Rybbit · Reports");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p className="text-neutral-400">Reports and analytics content will go here.</p>
    </div>
  );
}
