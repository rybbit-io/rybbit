import * as React from "react";
import { Button, ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@rybbit/ui";
import { Calendar, ChevronDown, Download, Maximize2, RefreshCw, Share2, ZoomIn, ZoomOut } from "lucide-react";

/** Canonical segmented control: outline siblings share borders; the selected one is the raised `default` chrome. */
export function Segmented() {
  return (
    <div className="p-4">
      <ButtonGroup>
        <Button variant="outline" size="sm">Day</Button>
        <Button variant="default" size="sm">Week</Button>
        <Button variant="outline" size="sm">Month</Button>
        <Button variant="outline" size="sm">Year</Button>
      </ButtonGroup>
    </div>
  );
}

/** A chart toolbar: icon buttons, a hairline `ButtonGroupSeparator`, then a text action. */
export function Toolbar() {
  return (
    <div className="p-4">
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Zoom out"><ZoomOut /></Button>
        <Button variant="outline" size="icon" aria-label="Zoom in"><ZoomIn /></Button>
        <Button variant="outline" size="icon" aria-label="Fit to screen"><Maximize2 /></Button>
        <ButtonGroupSeparator />
        <Button variant="outline"><Download /> Export</Button>
        <Button variant="outline"><Share2 /> Share</Button>
      </ButtonGroup>
    </div>
  );
}

/** `ButtonGroupText` is a static label cell that shares the group's borders; pair it with a split trigger. */
export function WithText() {
  return (
    <div className="p-4 flex flex-col gap-3 items-start">
      <ButtonGroup>
        <ButtonGroupText><Calendar /> Last 30 days</ButtonGroupText>
        <Button variant="outline" aria-label="Change range"><ChevronDown /></Button>
      </ButtonGroup>
      <ButtonGroup>
        <ButtonGroupText>tomato.gg</ButtonGroupText>
        <Button variant="outline"><RefreshCw /> Refresh</Button>
        <Button variant="accent">Add site</Button>
      </ButtonGroup>
    </div>
  );
}

/** `orientation="vertical"` stacks the members and merges the horizontal borders instead. */
export function Vertical() {
  return (
    <div className="p-4">
      <ButtonGroup orientation="vertical">
        <Button variant="outline" size="sm">Visitors</Button>
        <Button variant="default" size="sm">Pageviews</Button>
        <Button variant="outline" size="sm">Sessions</Button>
        <Button variant="outline" size="sm">Bounce rate</Button>
      </ButtonGroup>
    </div>
  );
}

/** Nesting groups inside a group inserts an 8px gap between the clusters (a real filter bar). */
export function Nested() {
  return (
    <div className="p-4">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm">Day</Button>
          <Button variant="default" size="sm">Week</Button>
          <Button variant="outline" size="sm">Month</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm">Line</Button>
          <Button variant="outline" size="sm">Bar</Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm" disabled>Compare</Button>
        </ButtonGroup>
      </ButtonGroup>
    </div>
  );
}
