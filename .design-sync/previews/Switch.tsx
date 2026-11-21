import * as React from "react";
import { Label, Switch } from "@rybbit/ui";

/** On (emerald track), off (neutral-800 track), and both disabled. */
export function States() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <div className="flex items-center gap-2">
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">On</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="off" />
        <Label htmlFor="off">Off</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="dis-on" disabled defaultChecked />
        <Label htmlFor="dis-on" className="opacity-70">Disabled, on</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="dis-off" disabled />
        <Label htmlFor="dis-off" className="opacity-70">Disabled, off</Label>
      </div>
    </div>
  );
}

/** A settings list: label + description on the left, switch pinned right. The most common composition. */
export function SettingsList() {
  const rows = [
    { id: "replay", label: "Session replay", desc: "Record sessions for the last 7 days.", on: true },
    { id: "vitals", label: "Web vitals", desc: "Collect LCP, CLS and INP from real visitors.", on: true },
    { id: "bots", label: "Block bot traffic", desc: "Drop events that match known crawlers.", on: true },
    { id: "public", label: "Public dashboard", desc: "Anyone with the link can view tomato.gg stats.", on: false },
  ];
  return (
    <div className="w-[420px] p-4">
      <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="grid gap-0.5">
              <Label htmlFor={r.id}>{r.label}</Label>
              <p className="text-xs text-neutral-400">{r.desc}</p>
            </div>
            <Switch id={r.id} defaultChecked={r.on} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact inline toggle in a toolbar, e.g. the "Live" mode toggle next to a date picker. */
export function Inline() {
  return (
    <div className="w-[420px] p-4">
      <div className="flex items-center gap-2 text-sm">
        <Switch id="live" defaultChecked />
        <Label htmlFor="live">Live</Label>
        <span className="text-neutral-400">· 128 visitors right now</span>
      </div>
    </div>
  );
}
