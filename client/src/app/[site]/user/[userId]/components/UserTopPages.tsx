import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Card } from "../../../../../components/ui/card";
import { truncateString } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";
import { OpenInLink, ProfileCardHeader } from "./ProfileCard";
import { useProfileHref, userFilter } from "./profileLinks";

/**
 * What this user looked at and did, side by side: both lists are on screen at
 * once instead of behind a tab, and each opens the same user on its own page.
 */
export function UserTopPages({ userId }: { userId: string }) {
  const t = useExtracted();
  const { data: siteMetadata } = useGetSite();
  const profileHref = useProfileHref();
  const filters = [userFilter(userId)];

  return (
    // Pairs up by the width of the profile's main column (a container), not the viewport.
    <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
      <Card>
        <div className="p-4">
          <ProfileCardHeader
            title={t("Top pages")}
            right={<OpenInLink href={profileHref("pages", filters)}>{t("Open in Pages")}</OpenInLink>}
          />
          <div className="mt-2.5">
            <StandardSection
              filterParameter="pathname"
              title={t("Pages")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => {
                const host = e.hostname || siteMetadata?.domain;
                return host ? `https://${host}${e.value}` : "#";
              }}
              additionalFilters={filters}
            />
          </div>
        </div>
      </Card>
      <Card>
        <div className="p-4">
          <ProfileCardHeader
            title={t("Events")}
            right={<OpenInLink href={profileHref("events", filters)}>{t("Open in Events")}</OpenInLink>}
          />
          <div className="mt-2.5">
            <StandardSection
              filterParameter="event_name"
              title={t("Events")}
              countLabel={t("Count")}
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              additionalFilters={filters}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
