import { Route } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import { Card } from "./Card";

export function UserSessions() {
  const t = useExtracted();

  return (
    <Card
      title={t("Trace the paths people actually take")}
      description={t("Journeys reveal the routes between landing, exploration, and conversion—without forcing your users into a predefined funnel.")}
      icon={Route}
    >
      <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#121212]">
        <Image
          src="/blog/rybbit_journey_dashboard.png"
          alt="Rybbit user journeys view mapping paths between pages"
          width={3456}
          height={1836}
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="h-auto min-h-[320px] w-full object-cover object-left-top"
        />
      </div>
    </Card>
  );
}
