"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useExtracted } from "next-intl";
import type { FormEvent } from "react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

type QueryPromptFormProps = {
  prompt: string;
  canUseQuery: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerate: (event: FormEvent<HTMLFormElement>) => void;
  onCancelGenerate: () => void;
};

export function QueryPromptForm({
  prompt,
  canUseQuery,
  isBusy,
  isGenerating,
  onPromptChange,
  onGenerate,
  onCancelGenerate,
}: QueryPromptFormProps) {
  const t = useExtracted();

  return (
    <form onSubmit={onGenerate} className="flex flex-col gap-2 md:flex-row">
      <Input
        value={prompt}
        onChange={event => onPromptChange(event.target.value)}
        placeholder={t("What do you want to query?")}
        disabled={!canUseQuery || isBusy}
        className="md:flex-1"
      />
      <Button type="submit" disabled={!canUseQuery || !prompt.trim() || isBusy} className="md:w-auto">
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {t("Generate")}
      </Button>
      {isGenerating && (
        <Button type="button" variant="outline" onClick={onCancelGenerate} className="md:w-auto">
          <X className="h-4 w-4" />
          {t("Cancel")}
        </Button>
      )}
    </form>
  );
}
