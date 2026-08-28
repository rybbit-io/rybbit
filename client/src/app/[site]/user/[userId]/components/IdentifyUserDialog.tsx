"use client";

import { useExtracted } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { useIdentifyUser } from "@/api/analytics/hooks/useIdentifyUser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildIdentifyTraits, type IdentifyTraitRowError } from "./identifyUserTraits";

interface IdentifyUserDialogProps {
  anonymousId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TraitRow {
  id: number;
  key: string;
  value: string;
}

export function IdentifyUserDialog({ anonymousId, open, onOpenChange }: IdentifyUserDialogProps) {
  const t = useExtracted();
  const identifyUser = useIdentifyUser();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [traitRows, setTraitRows] = useState<TraitRow[]>([]);
  const [traitErrors, setTraitErrors] = useState<Partial<Record<number, IdentifyTraitRowError>>>({});
  const nextTraitId = useRef(0);
  const traitKeyRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addTrait = () => {
    const id = nextTraitId.current++;
    setTraitRows(rows => [...rows, { id, key: "", value: "" }]);
    requestAnimationFrame(() => traitKeyRefs.current[id]?.focus());
  };

  const updateTrait = (id: number, field: "key" | "value", value: string) => {
    setTraitRows(rows => rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
    setTraitErrors({});
  };

  const removeTrait = (id: number) => {
    setTraitRows(rows => rows.filter(row => row.id !== id));
    setTraitErrors({});
    delete traitKeyRefs.current[id];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUserId = userId.trim();
    if (!trimmedUserId) return;

    const { traits, errors } = buildIdentifyTraits(name, email, traitRows);
    const errorsById = Object.fromEntries(
      Object.entries(errors).map(([index, error]) => [traitRows[Number(index)].id, error])
    );
    if (Object.keys(errorsById).length > 0) {
      setTraitErrors(errorsById);
      const firstInvalidRow = traitRows.find(row => row.id in errorsById);
      if (firstInvalidRow) traitKeyRefs.current[firstInvalidRow.id]?.focus();
      return;
    }

    try {
      await identifyUser.mutateAsync({
        anonymousId,
        userId: trimmedUserId,
        traits: Object.keys(traits).length > 0 ? traits : undefined,
      });
      toast.success(t("User identified"));
      onOpenChange(false);
      setUserId("");
      setName("");
      setEmail("");
      setTraitRows([]);
      setTraitErrors({});
      nextTraitId.current = 0;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to identify user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Identify User")}</DialogTitle>
          <DialogDescription>
            {t("Assign a user ID to this visitor. Their past activity from this device will be linked to it.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="identify-user-id">{t("User ID")}</Label>
            <Input
              id="identify-user-id"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder={t("e.g. user_123")}
              aria-describedby="identify-user-id-description"
              maxLength={255}
              autoFocus
              required
            />
            <p id="identify-user-id-description" className="text-xs text-muted-foreground">
              {t("The ID this person has in your own system, like an email or account ID.")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identify-name">{t("Name")}</Label>
            <Input
              id="identify-name"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setTraitErrors({});
              }}
              placeholder={t("e.g. Ada Lovelace")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identify-email">{t("Email")}</Label>
            <Input
              id="identify-email"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setTraitErrors({});
              }}
              placeholder={t("e.g. ada@example.com")}
            />
          </div>
          <div
            role="group"
            aria-labelledby="identify-traits-label"
            aria-describedby="identify-traits-description"
            className="space-y-2 border-t border-neutral-150 pt-3 dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p id="identify-traits-label" className="text-sm font-medium leading-none">
                  {t("Traits")}
                </p>
                <p id="identify-traits-description" className="text-xs text-muted-foreground">
                  {t("Add custom properties to this user. Values can be text, numbers, booleans, or JSON.")}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={addTrait}>
                <Plus />
                {t("Add trait")}
              </Button>
            </div>
            {traitRows.length > 0 && (
              <div className="-m-1 max-h-[32vh] space-y-2 overflow-y-auto p-1">
                {traitRows.map(row => {
                  const error = traitErrors[row.id];
                  const errorId = `identify-trait-${row.id}-error`;

                  return (
                    <div key={row.id} className="space-y-1">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2">
                        <Input
                          ref={element => {
                            traitKeyRefs.current[row.id] = element;
                          }}
                          value={row.key}
                          onChange={e => updateTrait(row.id, "key", e.target.value)}
                          placeholder={t("e.g. plan")}
                          aria-label={t("Trait key")}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? errorId : undefined}
                          className="min-w-0"
                        />
                        <Input
                          value={row.value}
                          onChange={e => updateTrait(row.id, "value", e.target.value)}
                          placeholder={t("e.g. pro")}
                          aria-label={t("Trait value")}
                          className="min-w-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="smIcon"
                          onClick={() => removeTrait(row.id)}
                          aria-label={t("Remove trait")}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {error && (
                        <p id={errorId} className="text-xs text-red-500 dark:text-red-400">
                          {error === "missing-key"
                            ? t("Enter a key for this trait.")
                            : t("Each trait key must be unique.")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={identifyUser.isPending || !userId.trim()}>
              {identifyUser.isPending ? t("Identifying...") : t("Identify")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
