import * as React from "react";
import { Alert, AlertDescription, AlertTitle, Button } from "@rybbit/ui";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Terminal } from "lucide-react";

/** Canonical inline alert: a lucide icon, a short title, one sentence of consequence. */
export function Canonical() {
  return (
    <div className="p-4 w-full max-w-lg">
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Tracking script detected</AlertTitle>
        <AlertDescription>tomato.gg sent its first pageview 12 seconds ago. Data will appear on the dashboard shortly.</AlertDescription>
      </Alert>
    </div>
  );
}

/** The variant axis: default, info, success, warning, destructive. Fill is a tint, icon carries the hue. */
export function Variants() {
  return (
    <div className="p-4 w-full max-w-lg flex flex-col gap-3">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Script snippet copied</AlertTitle>
        <AlertDescription>Paste it before the closing head tag on every page you want to track.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Data is delayed by up to 2 minutes</AlertTitle>
        <AlertDescription>Real-time counts update immediately; aggregated reports lag slightly.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Goal created</AlertTitle>
        <AlertDescription>“Signup completed” will start counting from the next matching event.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Approaching your event limit</AlertTitle>
        <AlertDescription>You have used 91% of 1M monthly events. Upgrade to keep collecting after the cap.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Domain verification failed</AlertTitle>
        <AlertDescription>No TXT record was found for rybbit.com. DNS changes can take up to an hour to propagate.</AlertDescription>
      </Alert>
    </div>
  );
}

/** Single-line alerts: title only, and description only, with and without an icon. */
export function Compact() {
  return (
    <div className="p-4 w-full max-w-lg flex flex-col gap-3">
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Bot filtering is on for this site</AlertTitle>
      </Alert>
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Session replay is paused because storage is full.</AlertDescription>
      </Alert>
      <Alert>
        <AlertDescription>Showing sampled data for the last 90 days.</AlertDescription>
      </Alert>
    </div>
  );
}

/** An alert that carries its own action; keep the button small and quiet. */
export function WithAction() {
  return (
    <div className="p-4 w-full max-w-lg">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No data received in the last 24 hours</AlertTitle>
        <AlertDescription>
          <p>The script may have been removed from staging.rybbit.dev during the last deploy.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline">View install guide</Button>
            <Button size="sm" variant="ghost">Dismiss</Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
