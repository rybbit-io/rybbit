"use client";

import { GSCManager } from "./GSCManager";

interface IntegrationsTabProps {
  disabled?: boolean;
}

export function IntegrationsTab({ disabled = false }: IntegrationsTabProps) {
  return (
    <div className="space-y-6">
      <GSCManager disabled={disabled} />
    </div>
  );
}
