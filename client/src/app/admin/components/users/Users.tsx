"use client";

import { AdminLayout } from "@/app/admin/components/shared/AdminLayout";
import { AdminTablePagination } from "@/app/admin/components/shared/AdminTablePagination";
import { ErrorAlert } from "@/app/admin/components/shared/ErrorAlert";
import { UserFilters } from "@/app/admin/components/users/UserFilters";
import { UsersTable } from "@/app/admin/components/users/UsersTable";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useRouter } from "next/navigation";

export function Users() {
  const router = useRouter();

  const {
    // Data
    users,
    total,

    // Loading state
    isLoading,
    isError,

    // Table state
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,

    // Actions
    handleImpersonate,
  } = useAdminUsers();

  const data = { users, total };

  // Handle impersonation with navigation
  const onImpersonate = async (userId: string) => {
    const success = await handleImpersonate(userId);
    if (success) {
      router.push("/");
      window.location.reload();
    }
  };

  if (isError) {
    return (
      <AdminLayout>
        <ErrorAlert message="Failed to load users. Please try again later." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Filters */}
        <UserFilters
          table={
            {
              getColumn: (columnId: string) => {
                const getFilterValue = () => columnFilters.find(filter => filter.id === columnId)?.value ?? "";

                const setFilterValue = (value: string) => {
                  const newFilters = columnFilters.filter(filter => filter.id !== columnId);
                  if (value) {
                    newFilters.push({ id: columnId, value });
                  }
                  setColumnFilters(newFilters);
                };

                return {
                  getFilterValue,
                  setFilterValue,
                };
              },
            } as any
          }
        />

        {/* Users Table */}
        <UsersTable
          data={data}
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
        />

        {/* Pagination */}
        <AdminTablePagination
          table={
            {
              getCanPreviousPage: () => pagination.pageIndex > 0,
              getCanNextPage: () => pagination.pageIndex < Math.ceil(total / pagination.pageSize) - 1,
              getPageCount: () => Math.ceil(total / pagination.pageSize),
              getState: () => ({ pagination }),
              setPageIndex: (index: number) => setPagination({ ...pagination, pageIndex: index }),
              previousPage: () =>
                setPagination({
                  ...pagination,
                  pageIndex: Math.max(0, pagination.pageIndex - 1),
                }),
              nextPage: () =>
                setPagination({
                  ...pagination,
                  pageIndex: Math.min(Math.ceil(total / pagination.pageSize) - 1, pagination.pageIndex + 1),
                }),
            } as any
          }
          data={data ? { items: data.users, total: data.total } : undefined}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="users"
        />
      </div>
    </AdminLayout>
  );
}
