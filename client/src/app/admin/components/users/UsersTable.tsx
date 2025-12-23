"use client";

import { useMemo, useState } from "react";
import { AdminUser } from "@/types/admin";
import { Check, ChevronsUpDown, MoreVertical, User, UserMinus, UserPlus } from "lucide-react";
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
import { parseUtcTimestamp } from "../../../../lib/dateTimeUtils";
import { AddToOrganizationDialog } from "./AddToOrganizationDialog";
import { useRemoveUserFromOrganization } from "@/api/admin/organizations";
import { useAdminOrganizations } from "@/api/admin/getAdminOrganizations";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
}: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showAddToOrgDialog, setShowAddToOrgDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");
  const [removeOrgComboboxOpen, setRemoveOrgComboboxOpen] = useState(false);

  const { data: organizations } = useAdminOrganizations();
  const removeUserFromOrganization = useRemoveUserFromOrganization();

  const handleRemoveFromOrganization = async () => {
    if (!selectedUser || !selectedOrganizationId) return;

    try {
      await removeUserFromOrganization.mutateAsync({
        memberIdOrEmail: selectedUser.email,
        organizationId: selectedOrganizationId,
      });
      toast.success("User removed from organization successfully");
      setShowRemoveConfirmDialog(false);
      setSelectedUser(null);
      setSelectedOrganizationId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user from organization");
    }
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => <SortableHeader column={column}>User ID</SortableHeader>,
        cell: ({ row }) => <div className="font-mono">{row.getValue("id")}</div>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => row.getValue("name") || "N/A",
      },
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
        cell: ({ row }) => row.getValue("email"),
      },
      {
        accessorKey: "role",
        header: ({ column }) => <SortableHeader column={column}>Role</SortableHeader>,
        cell: ({ row }) => row.getValue("role") || "user",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>Created At</SortableHeader>,
        cell: ({ row }) => <div>{parseUtcTimestamp(row.getValue("createdAt")).toRelative()}</div>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onImpersonate(row.original.id)}
                disabled={row.original.id === userStore.getState().user?.id}
              >
                <User className="mr-2 h-4 w-4" />
                Impersonate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(row.original);
                  setShowAddToOrgDialog(true);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add to Organization
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(row.original);
                  setShowRemoveConfirmDialog(true);
                }}
                className="text-orange-500 focus:text-orange-600"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Remove from Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    <div className="rounded-md border border-neutral-100 dark:border-neutral-800">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <UserTableSkeleton rowCount={pagination.pageSize} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4">
                No users found
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
            <AlertDialogTitle>Remove user from organization?</AlertDialogTitle>
            <AlertDialogDescription>
              Select the organization to remove {selectedUser?.email} from. They will lose access to all resources in
              that organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="remove-org">Organization</Label>
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
                    : "Select an organization..."}
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
                  <CommandInput placeholder="Search organizations..." />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
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
                            className={cn("mr-2 h-4 w-4", selectedOrganizationId === org.id ? "opacity-100" : "opacity-0")}
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
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromOrganization}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!selectedOrganizationId}
            >
              Remove from Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
