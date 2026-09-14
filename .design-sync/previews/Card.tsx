import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLoader,
  CardTitle,
  Skeleton,
} from "@rybbit/ui";
import { ArrowUp, ArrowDown } from "lucide-react";

/** The overview stat tile: muted 12px label, 24px figure, delta vs. the previous period. */
export function StatCard() {
  return (
    <div className="flex w-full max-w-xl gap-3 p-4">
      <Card className="flex-1">
        <div className="flex flex-col px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">Unique visitors</div>
          <div className="flex items-center justify-between gap-2 text-2xl font-medium">
            <span className="tabular-nums">18.4K</span>
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <ArrowUp className="h-3 w-3" strokeWidth={3} /> 12%
            </span>
          </div>
        </div>
      </Card>
      <Card className="flex-1">
        <div className="flex flex-col px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">Bounce rate</div>
          <div className="flex items-center justify-between gap-2 text-2xl font-medium">
            <span className="tabular-nums">41%</span>
            <span className="inline-flex items-center gap-1 text-sm text-red-400">
              <ArrowDown className="h-3 w-3" strokeWidth={3} /> 3%
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Full composition: header (title + description), content, footer with the single accent action. */
export function SettingsCard() {
  return (
    <div className="w-full max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>Bot detection</CardTitle>
          <CardDescription>Filter automated traffic out of tomato.gg before it reaches your reports.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Blocked in the last 24h</span>
            <span className="tabular-nums text-neutral-300">12,930 events</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sensitivity</span>
            <span className="text-neutral-300">Balanced</span>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" size="sm">Reset</Button>
          <Button variant="accent" size="sm">Save changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/** Loading: CardLoader is an absolutely positioned indeterminate bar pinned to the card's top edge. */
export function LoadingCard() {
  return (
    <div className="w-full max-w-md p-4">
      <Card>
        <CardLoader />
        <CardHeader>
          <CardTitle>Top pages</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/** A list card: header row with a count badge, hairline-divided rows in the content. */
export function ListCard() {
  const rows = [
    { name: "Chrome", share: "64.2%" },
    { name: "Safari", share: "21.8%" },
    { name: "Firefox", share: "7.5%" },
    { name: "Edge", share: "4.1%" },
  ];
  return (
    <div className="w-full max-w-md p-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Browsers</CardTitle>
          <Badge variant="secondary">4</Badge>
        </CardHeader>
        <CardContent className="flex flex-col text-sm">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between border-b border-neutral-800 py-2">
              <span>{r.name}</span>
              <span className="tabular-nums text-neutral-400">{r.share}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
