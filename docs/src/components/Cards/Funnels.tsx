import { Filter } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import { Card } from "./Card";

export function Funnels() {
  const t = useExtracted();

  return (
    <Card
      title={t("Find the exact point of friction")}
      description={t("Build funnels from pages or custom events, compare segments, and see where conversion changes over time.")}
      icon={Filter}
    >
      <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#121212]">
        <Image
          src="/blog/rybbit_funnels_dashboard.png"
          alt="Rybbit funnel analysis showing conversion between three steps"
          width={3456}
          height={1836}
          sizes="(max-width: 1024px) 100vw, 680px"
          className="h-full min-h-[260px] w-full object-cover object-left-top"
        />
      </div>
    </Card>
  );
}
