"use client";

import { useMemo, useState } from "react";
import { AdminUser } from "@/types/admin";
import { Check, ChevronsUpDown, MoreVertical, User, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserTableSkeleton } from "./UserTableSkeleton";
import { userStore } from "@/lib/userStore";
import { SortableHeader } from "../shared/SortableHeader";
import { TableShell } from "../shared/Panel";
import { Pagination } from "@/components/pagination";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { parseUtcTimestamp } from "../../../../lib/dateTimeUtils";
import { AddToOrganizationDialog } from "./AddToOrganizationDialog";
import { useRemoveUserFromOrganization } from "@/api/admin/hooks/useOrganizations";
import { useAdminOrganizations } from "@/api/admin/hooks/useAdminOrganizations";
import { toast } from "@/components/ui/sonner";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CopyText } from "../../../../components/CopyText";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";

interface UsersTableProps {
  data: { users: AdminUser[]; total: number } | undefined;
  isLoading: boolean;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: (value: { pageIndex: number; pageSize: number }) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
  onImpersonate: (userId: string) => void;
  hasActiveFilters?: boolean;
}

export function UsersTable({
  data,
  isLoading,
  pagination,
  setPagination,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
  globalFilter,
  setGlobalFilter,
  onImpersonate,
  hasActiveFilters = false,
}: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showAddToOrgDialog, setShowAddToOrgDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");
  const [removeOrgComboboxOpen, setRemoveOrgComboboxOpen] = useState(false);

  const { data: organizations } = useAdminOrganizations();
  const removeUserFromOrganization = useRemoveUserFromOrganization();
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();

  const handleRemoveFromOrganization = async () => {
    if (!selectedUser || !selectedOrganizationId) return;

    try {
      await removeUserFromOrganization.mutateAsync({
        memberIdOrEmail: selectedUser.email,
        organizationId: selectedOrganizationId,
      });
      toast.success(t("User removed from organization successfully"));
      setShowRemoveConfirmDialog(false);
      setSelectedUser(null);
      setSelectedOrganizationId("");
    } catch (error: any) {
      toast.error(error.message || t("Failed to remove user from organization"));
    }
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>{t("User")}</SortableHeader>,
        cell: ({ row }) => (
          <div className="py-0.5">
            <div className="font-medium">{row.original.name || row.original.email}</div>
            {row.original.name && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{row.original.email}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <SortableHeader column={column}>{t("Role")}</SortableHeader>,
        cell: ({ row }) => {
          const role = (row.getValue("role") as string) || "user";
          return role === "admin" ? (
            <Badge variant="info">{t("admin")}</Badge>
          ) : (
            <span className="text-neutral-500 dark:text-neutral-400">{role}</span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>{t("Created")}</SortableHeader>,
        cell: ({ row }) => (
          <div className="text-neutral-600 dark:text-neutral-300">
            {formatRelative(parseUtcTimestamp(row.getValue("createdAt")))}
          </div>
        ),
      },
      {
        accessorKey: "id",
        enableSorting: false,
        header: () => <span>{t("User ID")}</span>,
        cell: ({ row }) => (
          <CopyText
            text={row.original.id}
            maxLength={10}
            className="text-neutral-500 dark:text-neutral-400 [&>span]:text-xs"
          />
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("Actions")}</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t("Open menu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onImpersonate(row.original.id)}
                  disabled={row.original.id === userStore.getState().user?.id}
                >
                  <User className="h-4 w-4" />
                  {t("Impersonate")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(row.original);
                    setShowAddToOrgDialog(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  {t("Add to Organization")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(row.original);
                    setShowRemoveConfirmDialog(true);
                  }}
                  className="text-orange-500 focus:text-orange-600"
                >
                  <UserMinus className="h-4 w-4" />
                  {t("Remove from Organization")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  );

  // Initialize the table
  const table = useReactTable({
    data: data?.users || [],
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      globalFilter,
    },
    pageCount: data ? Math.ceil(data.total / pagination.pageSize) : -1,
    onSortingChange: updater => setSorting(typeof updater === "function" ? updater(sorting) : updater),
    onColumnFiltersChange: updater =>
      setColumnFilters(typeof updater === "function" ? updater(columnFilters) : updater),
    onPaginationChange: updater => setPagination(typeof updater === "function" ? updater(pagination) : updater),
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div>
      <TableShell>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className={cn(header.id === "actions" && "w-10")}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <UserTableSkeleton rowCount={10} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? t("No users match the current filters") : t("No users found")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <div className="mt-3">
        <Pagination
          table={table}
          data={data ? { items: data.users, total: data.total } : undefined}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="users"
        />
      </div>

      {/* Add to Organization Dialog */}
      {selectedUser && (
        <AddToOrganizationDialog
          userEmail={selectedUser.email}
          userId={selectedUser.id}
          open={showAddToOrgDialog}
          onOpenChange={setShowAddToOrgDialog}
        />
      )}

      {/* Remove from Organization Confirmation */}
      <AlertDialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Remove user from organization?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Select the organization to remove {email} from. They will lose access to all resources in that organization.",
                { email: selectedUser?.email ?? "" }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="remove-org">{t("Organization")}</Label>
            <Popover open={removeOrgComboboxOpen} onOpenChange={setRemoveOrgComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={removeOrgComboboxOpen}
                  className="w-full justify-between mt-2"
                >
                  {selectedOrganizationId
                    ? organizations?.find(org => org.id === selectedOrganizationId)?.name
                    : t("Select an organization...")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}
                >
                  <CommandInput placeholder={t("Search organizations...")} />
                  <CommandList>
                    <CommandEmpty>{t("No organization found.")}</CommandEmpty>
                    <CommandGroup>
                      {organizations?.map(org => (
                        <CommandItem
                          key={org.id}
                          value={`${org.name} ${org.id}`}
                          onSelect={() => {
                            setSelectedOrganizationId(org.id);
                            setRemoveOrgComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedOrganizationId === org.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {org.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedOrganizationId("");
              }}
            >
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromOrganization}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!selectedOrganizationId}
            >
              {t("Remove from Organization")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
