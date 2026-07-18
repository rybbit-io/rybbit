"use client";

import { useMemo, useState } from "react";
import { CopyButton, ToolButton, ToolField, ToolInput } from "../components/tool-ui";

export function UTMBuilderForm() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");

  const utmUrl = useMemo(() => {
    if (!url || !source || !medium || !campaign) return "";

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      urlObj.searchParams.set("utm_source", source);
      urlObj.searchParams.set("utm_medium", medium);
      urlObj.searchParams.set("utm_campaign", campaign);
      if (term) urlObj.searchParams.set("utm_term", term);
      if (content) urlObj.searchParams.set("utm_content", content);
      return urlObj.toString();
    } catch {
      return "";
    }
  }, [url, source, medium, campaign, term, content]);

  const clearForm = () => {
    setUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
  };

  return (
    <div className="space-y-6">
      <ToolField label="Website URL" htmlFor="utm-url" required>
        <ToolInput
          id="utm-url"
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </ToolField>

      <ToolField label="Campaign Source" htmlFor="utm-source" required hint="The referrer (e.g., google, newsletter)">
        <ToolInput
          id="utm-source"
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="google, newsletter, facebook"
        />
      </ToolField>

      <ToolField
        label="Campaign Medium"
        htmlFor="utm-medium"
        required
        hint="Marketing medium (e.g., cpc, email, social)"
      >
        <ToolInput
          id="utm-medium"
          type="text"
          value={medium}
          onChange={e => setMedium(e.target.value)}
          placeholder="cpc, email, social"
        />
      </ToolField>

      <ToolField
        label="Campaign Name"
        htmlFor="utm-campaign"
        required
        hint="Product, promo code, or slogan (e.g., summer_sale)"
      >
        <ToolInput
          id="utm-campaign"
          type="text"
          value={campaign}
          onChange={e => setCampaign(e.target.value)}
          placeholder="summer_sale, product_launch"
        />
      </ToolField>

      <ToolField label="Campaign Term" htmlFor="utm-term" hint="Identify the paid keywords (optional)">
        <ToolInput
          id="utm-term"
          type="text"
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="running_shoes, blue_widget"
        />
      </ToolField>

      <ToolField label="Campaign Content" htmlFor="utm-content" hint="Differentiate ads or links (optional)">
        <ToolInput
          id="utm-content"
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="logolink, textlink"
        />
      </ToolField>

      {utmUrl && (
        <ToolField label="Your UTM URL" htmlFor="utm-result" className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ToolInput
              id="utm-result"
              type="text"
              value={utmUrl}
              readOnly
              className="flex-1 font-mono text-xs"
            />
            <CopyButton value={utmUrl} variant="primary" className="shrink-0" />
          </div>
        </ToolField>
      )}

      <div className="flex gap-3 pt-2">
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
