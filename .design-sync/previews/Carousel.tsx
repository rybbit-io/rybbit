import * as React from "react";
import { Card, CardContent, Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@rybbit/ui";

const stats = [
  { label: "Visitors", value: "18.4K", delta: "+12.4%", up: true },
  { label: "Pageviews", value: "26.3K", delta: "+8.1%", up: true },
  { label: "Sessions", value: "21.0K", delta: "+9.6%", up: true },
  { label: "Bounce rate", value: "41%", delta: "−2.3 pt", up: true },
  { label: "Avg. session", value: "1m 12s", delta: "+4s", up: true },
  { label: "Events", value: "2.4M", delta: "−0.8%", up: false },
];

function StatCard({ label, value, delta, up }: (typeof stats)[number]) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-neutral-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        <div className={up ? "mt-1 text-xs tabular-nums text-emerald-400" : "mt-1 text-xs tabular-nums text-red-400"}>{delta} vs. previous 30 days</div>
      </CardContent>
    </Card>
  );
}

/**
 * Canonical: three stat cards per view. The prev/next buttons sit 48px OUTSIDE the track
 * (-left-12 / -right-12), so the parent reserves that gutter. At index 0 "Previous" is disabled.
 */
export function StatCards() {
  return (
    <div style={{ padding: "16px 64px" }} className="w-full">
      <Carousel>
        <CarouselContent>
          {stats.map((s) => (
            <CarouselItem key={s.label} style={{ flexBasis: "33.3333%" }}>
              <StatCard {...s} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

/** One slide per view with `opts={{ loop: true, startIndex: 1 }}`: both arrows enabled, mid-deck. */
export function SingleSlide() {
  const pages = [
    { site: "tomato.gg", path: "/", visitors: "18,420" },
    { site: "tomato.gg", path: "/pricing", visitors: "6,120" },
    { site: "rybbit.com", path: "/docs/script", visitors: "4,890" },
  ];
  return (
    <div style={{ padding: "16px 64px" }} className="w-full max-w-lg">
      <Carousel opts={{ loop: true, startIndex: 1 }}>
        <CarouselContent>
          {pages.map((p) => (
            <CarouselItem key={p.path}>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs font-medium text-neutral-400">Top page · {p.site}</div>
                  <div className="mt-1 text-lg font-semibold">{p.path}</div>
                  <div className="mt-1 text-sm text-neutral-400 tabular-nums">{p.visitors} visitors in the last 30 days</div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

/** `orientation="vertical"`: give CarouselContent a fixed height and `align: "start"` so whole slides show; the arrows move above/below and rotate. */
export function Vertical() {
  return (
    <div style={{ padding: "64px 16px" }} className="w-96">
      <Carousel orientation="vertical" opts={{ startIndex: 1, align: "start" }}>
        <CarouselContent style={{ height: 240 }}>
          {stats.slice(0, 4).map((s) => (
            <CarouselItem key={s.label} style={{ flexBasis: "50%" }}>
              <StatCard {...s} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
