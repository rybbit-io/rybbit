"use client";

import type { OrgRole } from "@rybbit/shared";
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
        {roles.map(role => {
          const { label, description } = roleInfo(role);
          return (
            <SelectItem key={role} value={role} textValue={label}>
              <span className="flex flex-col py-0.5">
                <span>{label}</span>
                {description && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-normal">
                    {description}
                  </span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
