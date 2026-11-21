import * as React from "react";
import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSortIndicator,
} from "@rybbit/ui";

const pages = [
  { path: "/", visitors: 18420, views: 26311, bounce: "41%", time: "1m 12s" },
  { path: "/pricing", visitors: 6120, views: 8034, bounce: "38%", time: "2m 04s" },
  { path: "/docs/script", visitors: 4890, views: 9912, bounce: "22%", time: "3m 40s" },
  { path: "/blog/session-replay", visitors: 2310, views: 2680, bounce: "57%", time: "0m 48s" },
  { path: "/signup", visitors: 1975, views: 2140, bounce: "19%", time: "1m 31s" },
];

/** The canonical analytics table: sortable numeric columns, right-aligned figures, hairline rows. */
export function TopPages() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Page</TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center justify-end gap-1">Visitors <TableSortIndicator sortDirection="desc" /></span>
          </TableHead>
          <TableHead className="text-right">
            <span className="inline-flex items-center justify-end gap-1">Views <TableSortIndicator /></span>
          </TableHead>
          <TableHead className="text-right">Bounce</TableHead>
          <TableHead className="text-right">Avg. time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((p) => (
          <TableRow key={p.path}>
            <TableCell className="font-medium">{p.path}</TableCell>
            <TableCell className="text-right tabular-nums">{p.visitors.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{p.views.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{p.bounce}</TableCell>
            <TableCell className="text-right tabular-nums">{p.time}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Status column with badges, a footer total, and a caption. */
export function SitesWithStatus() {
  const sites = [
    { name: "tomato.gg", plan: "Pro", status: "Tracking", events: "2.4M" },
    { name: "rybbit.com", plan: "Pro", status: "Tracking", events: "812K" },
    { name: "staging.rybbit.dev", plan: "Free", status: "No data", events: "0" },
  ];
  return (
    <Table>
      <TableCaption>Sites in the Acme organization, last 30 days.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Site</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Events</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sites.map((s) => (
          <TableRow key={s.name}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>{s.plan}</TableCell>
            <TableCell>
              <Badge variant={s.status === "Tracking" ? "success" : "warning"}>{s.status}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{s.events}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right tabular-nums">3.2M</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
