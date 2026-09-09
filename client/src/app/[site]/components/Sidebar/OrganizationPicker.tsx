import { Building2, Check, ChevronRight, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useUserOrganizations } from "../../../../api/admin/hooks/useOrganizations";
import { CreateOrganizationDialog } from "../../../../components/CreateOrganizationDialog";
import { Button } from "../../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { authClient } from "../../../../lib/auth";
import { cn } from "../../../../lib/utils";

const rowClass = "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors cursor-pointer";

const focusRingClass =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700";

function OrgSkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 animate-pulse">
      <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
      <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-28" />
    </div>
  );
}

interface OrganizationPickerProps {
  // Fired after switching to another existing organization.
  onOrganizationChange?: (organizationId: string) => void;
  // Fired after a new organization was created (and set active) from this picker.
  onOrganizationCreated?: () => void;
}

export function OrganizationPicker({ onOrganizationChange, onOrganizationCreated }: OrganizationPickerProps) {
  const t = useExtracted();
  const { data: organizations, isLoading } = useUserOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Mirrors OrganizationSelector: local state hides the setActive round-trip delay.
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrganization?.id) {
      setSelectedOrgId(activeOrganization.id);
    }
  }, [activeOrganization?.id]);

  // Hover-driven flyout with a grace period so the pointer can travel between
  // the trigger row and the flyout without closing it.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(() => cancelClose, []);

  const currentOrgId = selectedOrgId ?? activeOrganization?.id;
  const currentOrg = organizations?.find(org => org.id === currentOrgId);

  const handleSelect = (organizationId: string) => {
    setOpen(false);
    if (organizationId === currentOrgId) return;
    setSelectedOrgId(organizationId);
    authClient.organization.setActive({ organizationId });
    onOrganizationChange?.(organizationId);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Select organization")}
            onMouseEnter={() => {
              cancelClose();
              setOpen(true);
            }}
            onMouseLeave={scheduleClose}
            onClick={event => {
              // Radix would toggle the flyout shut when it is already open from
              // hover; make click idempotently open instead (touch/keyboard path).
              event.preventDefault();
              cancelClose();
              setOpen(true);
            }}
            className={cn(
              rowClass,
              focusRingClass,
              "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
              open && "bg-neutral-100 dark:bg-neutral-800/50"
            )}
          >
            <Building2 className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
            {currentOrg?.name || activeOrganization?.name ? (
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-900 dark:text-white">
                {currentOrg?.name ?? activeOrganization?.name}
              </span>
            ) : (
              <span className="h-3.5 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          // Lets the outer site popover keep this flyout from dismissing it.
          data-org-picker
          className="w-64 p-1"
          // Keep focus in the site search input when the flyout opens on hover.
          onOpenAutoFocus={event => event.preventDefault()}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, index) => <OrgSkeletonRow key={`org-skeleton-${index}`} />)
            ) : organizations?.length ? (
              organizations.map(org => {
                const isSelected = org.id === currentOrgId;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    className={cn(
                      rowClass,
                      focusRingClass,
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                      isSelected && "bg-neutral-50 dark:bg-neutral-800/40"
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-900 dark:text-white">{org.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                {t("No organizations available")}
              </div>
            )}
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-1 pt-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => {
                setCreateOpen(true);
                setOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("Create Organization")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => onOrganizationCreated?.()}
      />
    </>
  );
}
