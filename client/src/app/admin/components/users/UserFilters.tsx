"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtracted } from "next-intl";
import { SearchInput } from "../shared/SearchInput";

interface UserFiltersProps {
  email: string;
  onEmailChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
}

export function UserFilters({ email, onEmailChange, role, onRoleChange }: UserFiltersProps) {
  const t = useExtracted();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        placeholder={t("Filter by email...")}
        value={email}
        onChange={onEmailChange}
        className="w-full sm:w-auto sm:min-w-[280px]"
      />
      <Select value={role || "all"} onValueChange={value => onRoleChange(value === "all" ? "" : value)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("All roles")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All roles")}</SelectItem>
          <SelectItem value="admin">{t("Admin")}</SelectItem>
          <SelectItem value="user">{t("User")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
