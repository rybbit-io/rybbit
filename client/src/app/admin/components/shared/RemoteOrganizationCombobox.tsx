"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { AdminOrganizationOption } from "@/api/admin/endpoints";
import { useAdminOrganizationOptions } from "@/api/admin/hooks/useAdminOrganizations";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RemoteOrganizationComboboxProps {
  value: string;
  selectedName?: string;
  onSelect: (organization: AdminOrganizationOption) => void;
  disabled?: boolean;
  excludeId?: string;
}

export function RemoteOrganizationCombobox({
  value,
  selectedName,
  onSelect,
  disabled = false,
  excludeId,
}: RemoteOrganizationComboboxProps) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const { data, isLoading, isFetching, isError } = useAdminOrganizationOptions(debouncedSearch, open);
  const organizations = (data?.items ?? []).filter(organization => organization.id !== excludeId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? selectedName || value : t("Select an organization...")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-neutral-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t("Search organizations...")} />
          <CommandList>
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("Searching...")}
              </div>
            ) : isError ? (
              <div className="py-6 text-center text-sm text-red-600 dark:text-red-400">
                {t("Failed to load organizations")}
              </div>
            ) : organizations.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{t("No organization found.")}</div>
            ) : (
              <CommandGroup>
                {organizations.map(organization => (
                  <CommandItem
                    key={organization.id}
                    value={organization.id}
                    onSelect={() => {
                      onSelect(organization);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === organization.id ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                    <span className="ml-3 max-w-28 truncate text-xs text-muted-foreground">{organization.id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
