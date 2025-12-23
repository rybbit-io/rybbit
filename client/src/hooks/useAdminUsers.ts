"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { AdminUser } from "@/types/admin";
import { useRouter } from "next/navigation";

export function useAdminUsers() {
  const router = useRouter();
  // Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [globalFilter, setGlobalFilter] = useState("");

  // Function to fetch users
  const fetchUsers = async () => {
    // Default sort configuration from sorting state
    const sortBy = sorting.length > 0 ? sorting[0].id : "createdAt";
    const sortDirection = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "desc";

    // Apply filters if any
    let emailFilter = "";
    let roleFilter = "";

    columnFilters.forEach(filter => {
      if (filter.id === "email" && typeof filter.value === "string") {
        emailFilter = filter.value;
      }
      if (filter.id === "role" && typeof filter.value === "string") {
        roleFilter = filter.value;
      }
    });

    const response = await authClient.admin.listUsers({
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        sortBy,
        sortDirection,
        ...(emailFilter && {
          searchField: "email",
          searchOperator: "contains",
          searchValue: emailFilter.toLowerCase(),
        }),
        ...(roleFilter && {
          filterField: "role",
          filterOperator: "eq",
          filterValue: roleFilter,
        }),
      },
    });

    // Safely extract data
    const users = response.data?.users || [];
    const total = response.data?.total || 0;

    return {
      users,
      total,
    };
  };

  // Fetch data with React Query
  const { data, isLoading, isError, refetch } = useQuery<{
    users: AdminUser[];
    total: number;
  }>({
    queryKey: ["admin-users", pagination.pageIndex, pagination.pageSize, sorting, columnFilters, globalFilter],
    queryFn: fetchUsers,
  });

  // Handle impersonation
  const handleImpersonate = async (userId: string) => {
    try {
      await authClient.admin.impersonateUser({
        userId,
      });
      router.push("/");
      // Redirect to home after impersonation
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to impersonate user: ${errorMessage}`);
      return false;
    }
  };

  // Handle stop impersonation
  const handleStopImpersonating = async () => {
    try {
      await authClient.admin.stopImpersonating();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to stop impersonation: ${errorMessage}`);
      return false;
    }
  };

  return {
    // Data
    users: data?.users || [],
    total: data?.total || 0,

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
    refetch,
    handleImpersonate,
    handleStopImpersonating,
  };
}
