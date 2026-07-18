import { Activity } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import { Card } from "./Card";

export function RealTimeAnalytics() {
  const t = useExtracted();

  return (
    <Card
      title={t("A dashboard you can read at a glance")}
      description={t("See live traffic, acquisition, pages, and engagement in one clear view. Filter any dimension without rebuilding a report.")}
      icon={Activity}
    >
      <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#121212]">
        <Image
          src="/blog/rybbit_main_dashboard.png"
          alt="Rybbit dashboard with traffic metrics, trend charts, referrers, and top pages"
          width={3456}
          height={1828}
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="h-auto w-full"
        />
      </div>
    </Card>
  );
}
