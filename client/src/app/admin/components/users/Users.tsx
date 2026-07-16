"use client";

import { ErrorAlert } from "@/app/admin/components/shared/ErrorAlert";
import { UserFilters } from "@/app/admin/components/users/UserFilters";
import { UsersTable } from "@/app/admin/components/users/UsersTable";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";

export function Users() {
  const router = useRouter();
  const t = useExtracted();

  const {
    users,
    total,
    isLoading,
    isError,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
    handleImpersonate,
  } = useAdminUsers();

  const getFilterValue = (columnId: string) =>
    (columnFilters.find(filter => filter.id === columnId)?.value as string) ?? "";

  const setFilterValue = (columnId: string, value: string) => {
    const next = columnFilters.filter(filter => filter.id !== columnId);
    if (value) {
      next.push({ id: columnId, value });
    }
    setColumnFilters(next);
    // A new filter invalidates the current page
    setPagination({ ...pagination, pageIndex: 0 });
  };

  // Handle impersonation with navigation
  const onImpersonate = async (userId: string) => {
    const success = await handleImpersonate(userId);
    if (success) {
      router.push("/");
      window.location.reload();
    }
  };

  if (isError) {
    return <ErrorAlert message={t("Failed to load users. Please try again later.")} />;
  }

  return (
    <div className="space-y-3">
      <UserFilters
        email={getFilterValue("email")}
        onEmailChange={value => setFilterValue("email", value)}
        role={getFilterValue("role")}
        onRoleChange={value => setFilterValue("role", value)}
      />
      <UsersTable
        data={{ users, total }}
        isLoading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
        sorting={sorting}
        setSorting={setSorting}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        onImpersonate={onImpersonate}
        hasActiveFilters={columnFilters.length > 0}
      />
    </div>
  );
}
