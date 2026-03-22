"use client";

import { Search } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { AdminUser } from "@/types/admin";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExtracted } from "next-intl";

interface UserFiltersProps {
  table: Table<AdminUser>;
}

export function UserFilters({ table }: UserFiltersProps) {
  const t = useExtracted();
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        <Input
          placeholder={t("Filter by email...")}
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={e => table.getColumn("email")?.setFilterValue(e.target.value)}
          className="pl-9 bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800"
        />
      </div>
      <div className="w-full md:w-48">
        <Select
          value={(table.getColumn("role")?.getFilterValue() as string) ?? ""}
          onValueChange={value => {
            if (value === "all") {
              table.getColumn("role")?.setFilterValue("");
            } else {
              table.getColumn("role")?.setFilterValue(value);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("Filter by role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All Roles")}</SelectItem>
            <SelectItem value="admin">{t("Admin")}</SelectItem>
            <SelectItem value="user">{t("User")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
