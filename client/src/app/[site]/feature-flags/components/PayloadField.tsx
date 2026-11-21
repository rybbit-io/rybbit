"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { JsonEditor } from "./JsonEditor";

/** A JSON payload. Optional ones stay folded behind a button until there is something in them. */
export function PayloadField({
  required = false,
  value,
  onChange,
}: {
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useExtracted();
  const [expanded, setExpanded] = useState(required || value.trim().length > 0);
  const label = required ? t("Config payload") : t("Payload");

  if (!expanded && !required) {
    return (
      <Button type="button" size="sm" variant="ghost" className="-ml-2 w-fit" onClick={() => setExpanded(true)}>
        <Plus className="h-4 w-4" />
        {t("Add JSON payload")}
      </Button>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex h-6 items-center justify-between">
        <Label>{label}</Label>
        {!required && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => {
              onChange("");
              setExpanded(false);
            }}
          >
            {t("Remove")}
          </Button>
        )}
      </div>
      <JsonEditor
        ariaLabel={label}
        value={value}
        onChange={onChange}
        placeholder={required ? '{"theme":"dark"}' : '{"copy":"Try it now"}'}
        height={required ? 160 : 120}
      />
    </div>
  );
}
