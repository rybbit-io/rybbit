"use client";

import type { OrgRole, SiteGrantRole } from "@rybbit/shared";
import { useExtracted } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoleInfo } from "@/lib/roles";

interface RoleSelectProps {
  id?: string;
  value: string;
  onValueChange: (role: OrgRole) => void;
  /** The roles the current user may give, from the server (useOrgPermissions().assignableRoles). */
  roles: readonly OrgRole[];
}

/** A role option: its label, and underneath, what it allows. */
function RoleOption({ value, label, description }: { value: string; label: string; description?: string }) {
  return (
    <SelectItem value={value} textValue={label}>
      <span className="flex flex-col py-0.5">
        <span>{label}</span>
        {description && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-normal">{description}</span>
        )}
      </span>
    </SelectItem>
  );
}

/** A role picker listing only the roles the current user may assign, each with what it allows. */
export function RoleSelect({ id, value, onValueChange, roles }: RoleSelectProps) {
  const t = useExtracted();
  const roleInfo = useRoleInfo();

  return (
    <Select value={value} onValueChange={role => onValueChange(role as OrgRole)}>
      <SelectTrigger id={id}>
        {/* Just the label here; the descriptions are for choosing. */}
        <SelectValue placeholder={t("Select a role")}>{value ? roleInfo(value).label : null}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {roles.map(role => (
          <RoleOption key={role} value={role} {...roleInfo(role)} />
        ))}
      </SelectContent>
    </Select>
  );
}

// Radix Select items can't carry an empty value, so "no site role" gets a stand-in.
const OWN_ROLE = "own-role";

interface SiteRoleSelectProps {
  id?: string;
  /** null: no site role, so the person's own role applies. */
  value: SiteGrantRole | null;
  onValueChange: (role: SiteGrantRole | null) => void;
  /** The site roles to offer after the no-site-role option. */
  roles: readonly SiteGrantRole[];
  /** What the no-site-role option is called here, e.g. "Their organization role". */
  ownRoleLabel: string;
}

/** A picker for the role a site grant carries, or none. */
export function SiteRoleSelect({ id, value, onValueChange, roles, ownRoleLabel }: SiteRoleSelectProps) {
  const roleInfo = useRoleInfo();

  return (
    <Select
      value={value ?? OWN_ROLE}
      onValueChange={role => onValueChange(role === OWN_ROLE ? null : (role as SiteGrantRole))}
    >
      <SelectTrigger id={id}>
        <SelectValue>{value ? roleInfo(value).label : ownRoleLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <RoleOption value={OWN_ROLE} label={ownRoleLabel} />
        {roles.map(role => (
          <RoleOption key={role} value={role} {...roleInfo(role)} />
        ))}
      </SelectContent>
    </Select>
  );
}
