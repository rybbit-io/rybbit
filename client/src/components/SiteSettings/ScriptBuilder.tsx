"use client";

import { CodeSnippet } from "@/components/CodeSnippet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface ScriptBuilderProps {
  siteId: number;
}

export function ScriptBuilder({ siteId }: ScriptBuilderProps) {
  // Script configuration options
  const [debounceValue, setDebounceValue] = useState(500);
  const [autoTrackPageview, setAutoTrackPageview] = useState(true);
  const [autoTrack, setAutoTrack] = useState(true);
  const [trackQuery, setTrackQuery] = useState(true);
  const [trackOutbound, setTrackOutbound] = useState(true);
  const [trackErrors, setTrackErrors] = useState(false);
  const [webVitals, setWebVitals] = useState(false);
  const [skipPatterns, setSkipPatterns] = useState<string[]>([]);
  const [skipPatternsText, setSkipPatternsText] = useState("");
  const [maskPatterns, setMaskPatterns] = useState<string[]>([]);
  const [maskPatternsText, setMaskPatternsText] = useState("");

  // Handle pattern text area changes
  const handleSkipPatternsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setSkipPatternsText(e.target.value);
    try {
      // Try to parse as JSON if it starts with [ and ends with ]
      if (
        e.target.value.trim().startsWith("[") &&
        e.target.value.trim().endsWith("]")
      ) {
        setSkipPatterns(JSON.parse(e.target.value.trim()));
      } else {
        // Otherwise treat as line-separated values
        setSkipPatterns(
          e.target.value
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        );
      }
    } catch (err) {
      // If parsing fails, split by new lines
      setSkipPatterns(
        e.target.value
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      );
    }
  };

  const handleMaskPatternsChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMaskPatternsText(e.target.value);
    try {
      // Try to parse as JSON if it starts with [ and ends with ]
      if (
        e.target.value.trim().startsWith("[") &&
        e.target.value.trim().endsWith("]")
      ) {
        setMaskPatterns(JSON.parse(e.target.value.trim()));
      } else {
        // Otherwise treat as line-separated values
        setMaskPatterns(
          e.target.value
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        );
      }
    } catch (err) {
      // If parsing fails, split by new lines
      setMaskPatterns(
        e.target.value
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      );
    }
  };

  // Generate tracking script dynamically based on options
  const trackingScript = `<script
    src="${globalThis.location.origin}/api/script.js"
    data-site-id="${siteId}"${
    debounceValue !== 500
      ? `
    data-debounce="${debounceValue}"`
      : ""
  }${
    !autoTrackPageview
      ? `
  data-auto-track-pageview="false"`
      : ""
  }${
    !autoTrack
      ? `
  data-track-spa="false"`
      : ""
  }${!trackQuery ? `data-track-query="false"` : ""}${
    !trackOutbound
      ? `
    data-track-outbound="false"`
      : ""
  }${
    trackErrors
      ? `
    data-track-errors="true"`
      : ""
  }${
    skipPatterns.length > 0
      ? `
    data-skip-patterns='${JSON.stringify(skipPatterns)}'`
      : ""
  }${
    maskPatterns.length > 0
      ? `
    data-mask-patterns='${JSON.stringify(maskPatterns)}'`
      : ""
  }${
    webVitals
      ? `
    data-web-vitals="true"`
      : ""
  }
    defer
></script>`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Tracking Script
          </h4>
          <p className="text-xs text-muted-foreground">
            Add this script to the <code>&lt;head&gt;</code> of your website
          </p>
        </div>
        <CodeSnippet language="HTML" code={trackingScript} />

        {/* Script Options Section */}
        <div className="space-y-4">
          {/* Auto Track Initial Pageview Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="autoTrackPageview"
                  className="text-sm font-medium text-foreground block"
                >
                  Automatically track initial pageview
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Track the first pageview when the script loads
                </p>
              </div>
              <Switch
                id="autoTrackPageview"
                checked={autoTrackPageview}
                onCheckedChange={setAutoTrackPageview}
              />
            </div>
          </div>

          {/* Auto Track (SPA) Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="autoTrack"
                  className="text-sm font-medium text-foreground block"
                >
                  Automatically track SPA navigation
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  For SPAs: track page views when URL changes (using History
                  API)
                </p>
              </div>
              <Switch
                id="autoTrack"
                checked={autoTrack}
                onCheckedChange={setAutoTrack}
              />
            </div>
          </div>

          {/* Track Query Params Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="trackQuery"
                  className="text-sm font-medium text-foreground block"
                >
                  Track URL query parameters
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Include query parameters in tracked URLs (may contain
                  sensitive data)
                </p>
              </div>
              <Switch
                id="trackQuery"
                checked={trackQuery}
                onCheckedChange={setTrackQuery}
              />
            </div>
          </div>

          {/* Track Errors Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="trackErrors"
                  className="text-sm font-medium text-foreground block"
                >
                  Track JavaScript errors
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically capture and track JavaScript errors on your site
                </p>
              </div>
              <Switch
                id="trackErrors"
                checked={trackErrors}
                onCheckedChange={setTrackErrors}
              />
            </div>
          </div>

          {/* Track Outbound Links Option */}
          {/* <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="trackOutbound"
                  className="text-sm font-medium text-foreground block"
                >
                  Track outbound link clicks
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically track when users click links to external sites
                </p>
              </div>
              <Switch
                id="trackOutbound"
                checked={trackOutbound}
                onCheckedChange={setTrackOutbound}
              />
            </div>
          </div> */}

          {/* Web Vitals Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="webVitals"
                  className="text-sm font-medium text-foreground block"
                >
                  Enable Web Vitals performance metrics
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Collect Core Web Vitals (LCP, CLS, INP) and additional metrics
                  (FCP, TTFB)
                </p>
              </div>
              <Switch
                id="webVitals"
                checked={webVitals}
                onCheckedChange={setWebVitals}
              />
            </div>
          </div>

          {/* Skip Patterns Option */}
          <div className="space-y-2">
            <div>
              <Label
                htmlFor="skipPatterns"
                className="text-sm font-medium text-foreground block"
              >
                Skip Patterns
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                URL patterns to exclude from tracking (one per line)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>*</code> for single segment wildcard, <code>**</code>{" "}
                for multi-segment wildcard
              </p>
              <Textarea
                id="skipPatterns"
                placeholder="/admin/**&#10;/preview/*"
                className="mt-2 font-mono text-sm"
                value={skipPatternsText}
                onChange={handleSkipPatternsChange}
              />
            </div>
          </div>

          {/* Mask Patterns Option */}
          <div className="space-y-2">
            <div>
              <Label
                htmlFor="maskPatterns"
                className="text-sm font-medium text-foreground block"
              >
                Mask Patterns
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                URL patterns to anonymize in analytics (one per line)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                E.g. <code>/users/*/profile</code> will hide usernames,{" "}
                <code>/orders/**</code> will hide order details
              </p>
              <Textarea
                id="maskPatterns"
                placeholder="/users/*/profile&#10;/orders/**"
                className="mt-2 font-mono text-sm"
                value={maskPatternsText}
                onChange={handleMaskPatternsChange}
              />
            </div>
          </div>

          {/* Debounce Option */}
          <div className="space-y-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="debounce"
                className="text-sm font-medium text-foreground"
              >
                Debounce Duration (ms)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="debounce"
                  type="number"
                  min="0"
                  max="5000"
                  value={debounceValue}
                  onChange={(e) =>
                    setDebounceValue(parseInt(e.target.value) || 0)
                  }
                  className="max-w-[120px]"
                />
                <span className="text-xs text-muted-foreground">
                  Default: 500ms
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Time to wait before tracking a pageview after URL changes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
