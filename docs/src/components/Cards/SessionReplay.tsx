import { Play } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import { Card } from "./Card";

export function SessionReplay() {
  const t = useExtracted();

  return (
    <Card
      title={t("See the session behind the number")}
      description={t("Replay real visits with console events and a precise interaction timeline, then jump straight to the moment something went wrong.")}
      icon={Play}
    >
      <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#121212]">
        <Image
          src="/blog/replay_sessions.png"
          alt="Rybbit session replay with a recording timeline and captured browser events"
          width={1080}
          height={618}
          sizes="(max-width: 1024px) 100vw, 680px"
          className="h-full min-h-[260px] w-full object-cover object-left-top"
        />
      </div>
    </Card>
  );
}
