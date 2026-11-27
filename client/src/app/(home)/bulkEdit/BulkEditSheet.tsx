"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { fetchSitesFromOrg, updateSiteConfig } from "@/api/admin/endpoints";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { CountrySelector, getCountryName } from "@/components/SiteSettings/CountrySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";
import { IS_CLOUD } from "@/lib/const";
import { planIncludesReplay, planIncludesStandardFeatures } from "@/lib/subscription/planUtils";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";

import {
  applyPatches,
  buildPlan,
  BulkChoices,
  BulkSite,
  EMPTY_CHOICES,
  LIST_KEYS,
  LIST_LIMITS,
  ListChoice,
  ListKey,
  ListMode,
  listSummary,
  ListValueError,
  PatchResult,
  PlanChange,
  restrictPatches,
  SitePatch,
  ToggleChoice,
  ToggleKey,
  toggleSummary,
  validateListValue,
} from "./bulkEditPlan";
import { TokenInput } from "./TokenInput";

interface BulkEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** The selected sites, all of which the viewer may configure. */
  sites: BulkSite[];
  /** Every site took its update. */
  onApplied: () => void;
}

type Step = "edit" | "review" | "applying" | "failed";

type ToggleRowDef = {
  key: ToggleKey;
  label: string;
  /** The plan this feature needs, shown on cloud. */
  plan?: "Pro" | "Standard";
  /** The organization's plan doesn't include it, so it can't be turned on. */
  blocked?: boolean;
};

type ListRowDef = { key: ListKey; label: string; placeholder?: string };

export function BulkEditSheet({ open, onOpenChange, organizationId, sites, onApplied }: BulkEditSheetProps) {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const { data: subscription } = useStripeSubscription(organizationId);

  const [choices, setChoices] = useState<BulkChoices>(EMPTY_CHOICES);
  const [step, setStep] = useState<Step>("edit");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [failures, setFailures] = useState<PatchResult[]>([]);
  const [updatedCount, setUpdatedCount] = useState(0);
  // Text typed into a list but not added to it, by list.
  const [drafts, setDrafts] = useState<Partial<Record<ListKey, string>>>({});

  // An apply outlives the sheet if the organization changes under it; by then its
  // outcome belongs to a selection that is gone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The sheet has no trigger of its own, so closing it hands focus back by hand.
  const [opener] = useState(() => (typeof document === "undefined" ? null : document.activeElement));

  const plan = useMemo(() => buildPlan(sites, choices), [sites, choices]);

  // The same entitlements the per-site Tracking tab applies.
  const replayBlocked = IS_CLOUD && !planIncludesReplay(subscription);
  const standardBlocked = IS_CLOUD && !planIncludesStandardFeatures(subscription);

  const toggleSections: { title: string; rows: ToggleRowDef[] }[] = [
    {
      title: t("Analytics Features"),
      rows: [
        { key: "sessionReplay", label: t("Session Replay"), plan: "Pro", blocked: replayBlocked },
        // Web Vitals is a cloud feature; site settings doesn't offer it when self-hosting.
        ...(IS_CLOUD
          ? [{ key: "webVitals", label: t("Web Vitals"), plan: "Standard", blocked: standardBlocked } as ToggleRowDef]
          : []),
        { key: "trackSpaNavigation", label: t("SPA Navigation") },
        { key: "trackUrlParams", label: t("URL Parameters") },
        { key: "trackUrlFragments", label: t("Track URL fragments") },
        { key: "trackInitialPageView", label: t("Initial Page View") },
        { key: "trackOutbound", label: t("Outbound Links") },
        { key: "trackErrors", label: t("Error Tracking"), plan: "Standard", blocked: standardBlocked },
      ],
    },
    {
      title: t("Auto Capture"),
      rows: [
        { key: "trackButtonClicks", label: t("Button Clicks"), plan: "Standard", blocked: standardBlocked },
        { key: "trackCopy", label: t("Copy Events"), plan: "Standard", blocked: standardBlocked },
        { key: "trackFormInteractions", label: t("Form Interactions"), plan: "Standard", blocked: standardBlocked },
      ],
    },
    {
      title: t("Privacy & Security"),
      rows: [
        { key: "public", label: t("Public Analytics") },
        { key: "saltUserIds", label: t("User ID Salting") },
        { key: "blockBots", label: t("Block Bot Traffic") },
        { key: "firstPartyProxy", label: t("First-Party Proxy") },
        { key: "trackIp", label: t("Track IP Address") },
      ],
    },
  ];

  const listSections: { title: string; rows: ListRowDef[] }[] = [
    {
      title: t("Exclusions"),
      rows: [
        { key: "excludedIPs", label: t("IP Exclusions"), placeholder: "e.g., 192.168.1.1 or 10.0.0.0/24" },
        { key: "excludedCountries", label: t("Country Exclusions"), placeholder: "e.g., US" },
        { key: "excludedASNs", label: t("ASN Exclusions"), placeholder: "e.g., AS13335" },
        { key: "excludedPaths", label: t("Path Exclusions"), placeholder: "e.g., /admin/* or /preview" },
        {
          key: "excludedQueryParams",
          label: t("Query Param Exclusions"),
          placeholder: "e.g., preview or utm_source=internal",
        },
        { key: "excludedHostnames", label: t("Hostname Exclusions"), placeholder: "e.g., localhost or *.vercel.app" },
        { key: "excludedUserAgents", label: t("User Agent Exclusions"), placeholder: "e.g., HeadlessChrome" },
      ],
    },
    { title: t("Tags"), rows: [{ key: "tags", label: t("Site Tags") }] },
  ];

  const labels = Object.fromEntries(
    [...toggleSections, ...listSections].flatMap(section => section.rows.map(row => [row.key, row.label]))
  ) as Record<ToggleKey | ListKey, string>;

  const listErrors: Record<ListValueError, string> = {
    ip: t("Not a valid IP address, CIDR block or IPv4 range"),
    country: t("Not a valid country code"),
    asn: t("An ASN is a number, optionally prefixed with AS"),
    queryParam: t("A query param rule needs a name before the ="),
    tooLong: t("That entry is too long"),
  };

  // A list entry that was typed but refused, or not yet added. Reviewing past it
  // would apply the list without it: for Replace, possibly an empty one.
  const hasPendingDraft = LIST_KEYS.some(
    key => (choices.lists[key]?.mode ?? "keep") !== "keep" && (drafts[key] ?? "").trim() !== ""
  );

  const describeChange = (change: PlanChange): string | null => {
    if (change.changed === 0) {
      // Nothing to say when every site was held back by the limit: that note follows.
      return change.kind === "list" && change.overLimit > 0 ? null : t("Every selected site already has this");
    }
    const count = change.changed;
    if (change.kind === "toggle") {
      return change.value
        ? t("Turns on for {count, plural, one {# site} other {# sites}}", { count })
        : t("Turns off for {count, plural, one {# site} other {# sites}}", { count });
    }
    switch (change.mode) {
      case "add":
        return t("Adds entries on {count, plural, one {# site} other {# sites}}", { count });
      case "remove":
        return t("Removes entries from {count, plural, one {# site} other {# sites}}", { count });
      case "replace":
        return (choices.lists[change.key]?.values.length ?? 0) === 0
          ? t("Clears the list on {count, plural, one {# site} other {# sites}}", { count })
          : t("Replaces the list on {count, plural, one {# site} other {# sites}}", { count });
    }
  };

  const limitNote = (change: PlanChange) =>
    change.kind === "list" && change.overLimit > 0 ? (
      <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
        {t(
          "{count, plural, one {# site keeps its list} other {# sites keep their lists}}: this would pass {max} entries.",
          { count: change.overLimit, max: String(LIST_LIMITS[change.key]) }
        )}
      </p>
    ) : null;

  const setToggle = (key: ToggleKey, choice: ToggleChoice) =>
    setChoices(prev => ({ ...prev, toggles: { ...prev.toggles, [key]: choice } }));
  const setList = (key: ListKey, choice: ListChoice) =>
    setChoices(prev => ({ ...prev, lists: { ...prev.lists, [key]: choice } }));

  const refreshSites = () => {
    queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
    // Prefix match, so every open site's settings and exclusion lists reload.
    queryClient.invalidateQueries({ queryKey: ["get-site"] });
    LIST_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const run = async (patches: SitePatch[], alreadyUpdated: number) => {
    setStep("applying");
    setProgress({ done: 0, total: patches.length });
    const results = await applyPatches(patches, updateSiteConfig, done => setProgress({ done, total: patches.length }));
    refreshSites();
    if (!mounted.current) return;
    const failed = results.filter(result => result.error !== undefined);
    const updated = alreadyUpdated + results.length - failed.length;
    if (failed.length > 0) {
      setUpdatedCount(updated);
      setFailures(failed);
      setStep("failed");
      return;
    }
    toast.success(
      updated === 0
        ? t("Every selected site already matches")
        : t("{count, plural, one {Updated # site} other {Updated # sites}}", { count: updated })
    );
    onApplied();
    onOpenChange(false);
  };

  // Sends the reviewed writes, or on a retry the ones that failed. The values are
  // worked out from the sites as they are now, so adding to a list doesn't drop an
  // entry someone else just saved, but nothing outside what was reviewed is written.
  const apply = async (reviewed: SitePatch[], alreadyUpdated: number, returnTo: Step) => {
    setStep("applying");
    setProgress({ done: 0, total: reviewed.length });
    let fresh: BulkSite[];
    try {
      const reviewedIds = new Set(reviewed.map(patch => patch.siteId));
      fresh = (await fetchSitesFromOrg(organizationId)).sites.filter(site => reviewedIds.has(site.siteId));
    } catch {
      if (!mounted.current) return;
      toast.error(t("Couldn't load the latest settings. Nothing was changed."));
      setStep(returnTo);
      return;
    }
    await run(restrictPatches(buildPlan(fresh, choices).patches, reviewed), alreadyUpdated);
  };

  const renderToggleRow = (row: ToggleRowDef) => {
    const { on, total } = toggleSummary(sites, row.key);
    // None of the selected sites has this setting (they are all mobile apps).
    if (total === 0) return null;
    const choice = choices.toggles[row.key] ?? "keep";
    const change = plan.changes.find(c => c.kind === "toggle" && c.key === row.key);
    const summary =
      on === total
        ? t("On for all {total}", { total: String(total) })
        : on === 0
          ? t("Off for all {total}", { total: String(total) })
          : t("On for {on} of {total}", { on: String(on), total: String(total) });
    return (
      <SettingRow
        key={row.key}
        label={row.label}
        badge={IS_CLOUD && row.plan ? <Badge variant="success">{row.plan}</Badge> : null}
        summary={summary}
        note={change ? describeChange(change) : null}
      >
        <SegmentedControl<ToggleChoice>
          size="sm"
          aria-label={row.label}
          value={choice}
          onValueChange={value => setToggle(row.key, value)}
          options={[
            { value: "keep", label: t("Keep") },
            { value: "on", label: t("On"), disabled: row.blocked },
            { value: "off", label: t("Off") },
          ]}
        />
      </SettingRow>
    );
  };

  const renderListRow = (row: ListRowDef) => {
    const choice = choices.lists[row.key] ?? { mode: "keep", values: [] };
    const withEntries = listSummary(sites, row.key);
    const change = plan.changes.find(c => c.kind === "list" && c.key === row.key);
    const isCountries = row.key === "excludedCountries";
    const help: Record<Exclude<ListMode, "keep">, string> = {
      add: t("Added to each site's list. Entries a site already has aren't added twice."),
      remove: t("Removed from every site that has them."),
      replace: t("Each site's list becomes exactly this. Leave it empty to clear the list."),
    };
    return (
      <div key={row.key} className="py-2.5">
        <SettingRow
          className="py-0"
          label={row.label}
          summary={
            withEntries === 0
              ? t("Empty on every site")
              : t("{count} of {total} have entries", { count: String(withEntries), total: String(sites.length) })
          }
          note={change ? describeChange(change) : null}
        >
          <SegmentedControl<ListMode>
            size="sm"
            aria-label={row.label}
            value={choice.mode}
            onValueChange={mode => setList(row.key, { ...choice, mode })}
            options={[
              { value: "keep", label: t("Keep") },
              { value: "add", label: t("Add") },
              { value: "remove", label: t("Remove") },
              { value: "replace", label: t("Replace") },
            ]}
          />
        </SettingRow>
        {choice.mode !== "keep" && (
          <div className="mt-2.5 space-y-2">
            <TokenInput
              aria-label={t("Entries for {setting}", { setting: row.label })}
              values={choice.values}
              onChange={values =>
                setList(row.key, {
                  ...choice,
                  values: isCountries ? [...new Set(values.map(value => value.toUpperCase()))] : values,
                })
              }
              draft={drafts[row.key] ?? ""}
              onDraftChange={draft => setDrafts(prev => ({ ...prev, [row.key]: draft }))}
              placeholder={row.placeholder}
              validate={value => {
                const problem = validateListValue(row.key, value);
                return problem ? listErrors[problem] : null;
              }}
              renderValue={isCountries ? getCountryName : undefined}
            />
            {isCountries && (
              <CountrySelector
                selectedCountries={choice.values}
                onSelect={code => setList(row.key, { ...choice, values: [...choice.values, code] })}
              />
            )}
            <p className="text-xs text-muted-foreground">{help[choice.mode]}</p>
            {change && limitNote(change)}
          </div>
        )}
      </div>
    );
  };

  const siteCount = sites.length;
  const changedSites = plan.patches.length;

  return (
    <Sheet open={open} onOpenChange={next => step !== "applying" && onOpenChange(next)}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        onCloseAutoFocus={event => {
          if (opener instanceof HTMLElement && opener.isConnected) {
            event.preventDefault();
            opener.focus();
          }
        }}
      >
        <header className="border-b border-neutral-100 px-6 pb-4 pt-5 pr-12 dark:border-neutral-850">
          <SheetTitle>{t("{count, plural, one {Edit # site} other {Edit # sites}}", { count: siteCount })}</SheetTitle>
          <SheetDescription className="mt-1">
            {step === "edit"
              ? t("Only the settings you change are applied. Anything left on Keep stays the way each site has it.")
              : step === "failed"
                ? t("Some sites couldn't be updated.")
                : t("Check what will change before it is applied.")}
          </SheetDescription>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "edit" && (
            <div className="space-y-6">
              {toggleSections.map(section => {
                const rows = section.rows.map(renderToggleRow).filter(Boolean);
                return rows.length > 0 ? (
                  <Section key={section.title} title={section.title}>
                    {rows}
                  </Section>
                ) : null;
              })}
              {listSections.map(section => (
                <Section key={section.title} title={section.title}>
                  {section.rows.map(renderListRow)}
                </Section>
              ))}
            </div>
          )}

          {(step === "review" || step === "applying") && (
            <div className="space-y-6">
              <Section title={t("Changes")}>
                {plan.changes.map(change => (
                  <div key={change.key} className="py-2.5">
                    <div className="text-sm font-medium">{labels[change.key]}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{describeChange(change)}</div>
                    {change.kind === "list" && (choices.lists[change.key]?.values.length ?? 0) > 0 && (
                      <div className="mt-1 break-words text-xs text-muted-foreground">
                        {choices.lists[change.key]!.values.map(value =>
                          change.key === "excludedCountries" ? getCountryName(value) : value
                        ).join(", ")}
                      </div>
                    )}
                    {limitNote(change)}
                  </div>
                ))}
              </Section>
              <Section
                title={t("{count, plural, one {# site will change} other {# sites will change}}", {
                  count: changedSites,
                })}
              >
                <ul className="py-2.5 text-sm text-muted-foreground">
                  {plan.patches.map(patch => (
                    <li key={patch.siteId} className="truncate py-0.5">
                      {patch.name}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          )}

          {step === "failed" && (
            <Section
              title={t("{failed} of {total, plural, one {# site} other {# sites}} couldn't be updated", {
                failed: String(failures.length),
                total: failures.length + updatedCount,
              })}
            >
              {failures.map(({ patch, error }) => (
                <div key={patch.siteId} className="py-2.5">
                  <div className="truncate text-sm font-medium">{patch.name}</div>
                  <div className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</div>
                </div>
              ))}
            </Section>
          )}
        </div>

        <footer className="border-t border-neutral-100 px-6 py-3 dark:border-neutral-850">
          {step === "applying" && (
            <div className="mb-3 space-y-1.5" role="status">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <p className="text-xs text-muted-foreground">
                {t("Updating {done} of {total}", { done: String(progress.done), total: String(progress.total) })}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {step === "edit" &&
                (hasPendingDraft
                  ? t("Fix or clear the entry that wasn't added")
                  : plan.changes.length === 0
                    ? t("Nothing changed yet")
                    : changedSites === 0
                      ? t("Every selected site already matches")
                      : t(
                          "{settings, plural, one {# setting} other {# settings}} changed on {sites, plural, one {# site} other {# sites}}",
                          { settings: plan.changes.filter(change => change.changed > 0).length, sites: changedSites }
                        ))}
              {step === "failed" &&
                t("{count, plural, one {# site was updated} other {# sites were updated}}", { count: updatedCount })}
            </p>
            <div className="flex items-center gap-2">
              {step === "edit" && (
                <>
                  <Button onClick={() => onOpenChange(false)}>{t("Cancel")}</Button>
                  <Button
                    variant="success"
                    disabled={changedSites === 0 || hasPendingDraft}
                    onClick={() => setStep("review")}
                  >
                    {t("Review changes")}
                  </Button>
                </>
              )}
              {(step === "review" || step === "applying") && (
                <>
                  <Button disabled={step === "applying"} onClick={() => setStep("edit")}>
                    {t("Back")}
                  </Button>
                  <Button
                    variant="success"
                    loading={step === "applying"}
                    onClick={() => apply(plan.patches, 0, "review")}
                  >
                    {t("{count, plural, one {Apply to # site} other {Apply to # sites}}", { count: changedSites })}
                  </Button>
                </>
              )}
              {step === "failed" && (
                <>
                  <Button onClick={() => onOpenChange(false)}>{t("Close")}</Button>
                  <Button
                    variant="success"
                    onClick={() =>
                      apply(
                        failures.map(failure => failure.patch),
                        updatedCount,
                        "failed"
                      )
                    }
                  >
                    {t("Retry")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="pb-1.5 text-base font-semibold tracking-tight">{title}</h3>
      <div className="divide-y divide-neutral-100 border-y border-neutral-100 dark:divide-neutral-850 dark:border-neutral-850">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  label,
  badge,
  summary,
  note,
  children,
  className = "py-2.5",
}: {
  label: string;
  badge?: ReactNode;
  /** What the selected sites have now. */
  summary: string;
  /** What the current choice would do, once it is off Keep. */
  note: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {badge}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{summary}</span>
          {note && (
            <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {note}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
