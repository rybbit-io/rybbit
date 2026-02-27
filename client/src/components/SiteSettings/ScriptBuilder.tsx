"use client";

import { CodeSnippet } from "@/components/CodeSnippet";
import { VerifyInstallation } from "@/components/VerifyInstallation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExtracted } from "next-intl";
import { useState } from "react";

interface ScriptBuilderProps {
  siteId: string;
}

export function ScriptBuilder({ siteId }: ScriptBuilderProps) {
  const t = useExtracted();
  const [debounceValue, setDebounceValue] = useState(500);
  const [skipPatterns, setSkipPatterns] = useState<string[]>([]);
  const [skipPatternsText, setSkipPatternsText] = useState("");
  const [maskPatterns, setMaskPatterns] = useState<string[]>([]);
  const [maskPatternsText, setMaskPatternsText] = useState("");

  // Handle pattern text area changes
  const handleSkipPatternsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSkipPatternsText(e.target.value);
    try {
      // Try to parse as JSON if it starts with [ and ends with ]
      if (e.target.value.trim().startsWith("[") && e.target.value.trim().endsWith("]")) {
        setSkipPatterns(JSON.parse(e.target.value.trim()));
      } else {
        // Otherwise treat as line-separated values
        setSkipPatterns(
          e.target.value
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
        );
      }
    } catch (err) {
      // If parsing fails, split by new lines
      setSkipPatterns(
        e.target.value
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
      );
    }
  };

  const handleMaskPatternsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMaskPatternsText(e.target.value);
    try {
      // Try to parse as JSON if it starts with [ and ends with ]
      if (e.target.value.trim().startsWith("[") && e.target.value.trim().endsWith("]")) {
        setMaskPatterns(JSON.parse(e.target.value.trim()));
      } else {
        // Otherwise treat as line-separated values
        setMaskPatterns(
          e.target.value
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
        );
      }
    } catch (err) {
      // If parsing fails, split by new lines
      setMaskPatterns(
        e.target.value
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
      );
    }
  };

  // Generate tracking script dynamically based on options
  const trackingScript = `<script
    src="${globalThis.location.origin}/api/script.js"
    data-site-id="${siteId}"${debounceValue !== 500
      ? `
    data-debounce="${debounceValue}"`
      : ""
    }${skipPatterns.length > 0
      ? `
    data-skip-patterns='${JSON.stringify(skipPatterns)}'`
      : ""
    }${maskPatterns.length > 0
      ? `
    data-mask-patterns='${JSON.stringify(maskPatterns)}'`
      : ""
    }
    defer
></script>`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("Tracking Script")}</h4>
          <p className="text-xs text-muted-foreground">
            {t("Add this script to the {headTag} of your website", { headTag: "<head>" })}
          </p>
        </div>
        <CodeSnippet language="HTML" code={trackingScript} />

        <VerifyInstallation siteId={siteId} />

        {/* Script Options Section */}
        <div className="space-y-4">
          {/* Skip Patterns Option */}
          <div className="space-y-2">
            <div>
              <Label htmlFor="skipPatterns" className="text-sm font-medium text-foreground block">
                {t("Skip Patterns")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">{t("URL patterns to exclude from tracking (one per line)")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Use * for single segment wildcard, ** for multi-segment wildcard")}
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
              <Label htmlFor="maskPatterns" className="text-sm font-medium text-foreground block">
                {t("Mask Patterns")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("URL patterns to anonymize in analytics (one per line)")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("E.g. /users/*/profile will hide usernames, /orders/** will hide order details")}
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
              <Label htmlFor="debounce" className="text-sm font-medium text-foreground">
                {t("Debounce Duration (ms)")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="debounce"
                  type="number"
                  min="0"
                  max="5000"
                  value={debounceValue}
                  onChange={e => setDebounceValue(parseInt(e.target.value) || 0)}
                  className="max-w-[120px]"
                />
                <span className="text-xs text-muted-foreground">{t("Default: 500ms")}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("Time to wait before tracking a pageview after URL changes")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
