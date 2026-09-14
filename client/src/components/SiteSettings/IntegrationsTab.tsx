"use client";

import { useExtracted } from "next-intl";

import { GSCManager } from "./GSCManager";
import { SettingsSection, SettingsSections } from "./SettingsSection";

interface IntegrationsTabProps {
  disabled?: boolean;
  siteId?: number;
}

export function IntegrationsTab({ disabled = false, siteId }: IntegrationsTabProps) {
  const t = useExtracted();

  return (
    <SettingsSections>
      <SettingsSection
        title={t("Google Search Console")}
        description={t("Connect your Google Search Console account to view search performance data")}
      >
        <GSCManager disabled={disabled} siteId={siteId} />
      </SettingsSection>
    </SettingsSections>
  );
}
