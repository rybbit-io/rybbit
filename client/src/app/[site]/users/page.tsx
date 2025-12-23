"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { getTimezone } from "@/lib/store";
import { ArrowDown, ArrowUp, ArrowUpDown, Monitor, Smartphone, Tablet } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { UsersResponse } from "../../../api/analytics/endpoints";
import { useGetUsers } from "../../../api/analytics/hooks/useGetUsers";
import { Avatar } from "../../../components/Avatar";
import { ChannelIcon, extractDomain, getDisplayName } from "../../../components/Channel";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { ErrorState } from "../../../components/ErrorState";
import { Favicon } from "../../../components/Favicon";
import { IdentifiedBadge } from "../../../components/IdentifiedBadge";
import { Pagination } from "../../../components/pagination";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getCountryName, getUserDisplayName } from "../../../lib/utils";
import { Browser } from "../components/shared/icons/Browser";
import { CountryFlag } from "../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../components/shared/icons/OperatingSystem";
import { SubHeader } from "../components/SubHeader/SubHeader";

// Set up column helper
const columnHelper = createColumnHelper<UsersResponse>();

// Create a reusable sort header component
const SortHeader = ({ column, children }: any) => {
  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted ? isSorted === "asc" : true)}
      className="p-0 hover:bg-transparent"
    >
      {children}
      {isSorted ? (
        isSorted === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
};

export default function UsersPage() {
  useSetPageTitle("Rybbit · Users");

  const { site } = useParams();

  // State for server-side operations
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "last_seen", desc: true }]);
  const [identifiedOnly, setIdentifiedOnly] = useState(false);

  // Convert page index to 1-based for the API
  const page = pagination.pageIndex + 1;

  // Get the first sorting column
  const sortBy = sorting.length > 0 ? sorting[0].id : "last_seen";
  const sortOrder = sorting.length > 0 && !sorting[0].desc ? "asc" : "desc";

  // Fetch data
  const { data, isLoading, isError } = useGetUsers({
    page,
    pageSize: pagination.pageSize,
    sortBy,
    sortOrder,
    identifiedOnly,
  });

  // Format relative time with special handling for times less than 1 minute
  const formatRelativeTime = (dateStr: string) => {
    const date = DateTime.fromSQL(dateStr, { zone: "utc" }).setZone(getTimezone());
    const diff = Math.abs(date.diffNow(["minutes"]).minutes);

    if (diff < 1) {
      return "<1 min ago";
    }

    return date.toRelative();
  };

  // Define table columns with consistent Title Case capitalization
  const columns = [
    columnHelper.accessor("user_id", {
      header: "User",
      cell: info => {
        const identifiedUserId = info.row.original.identified_user_id;
        const isIdentified = !!info.row.original.identified_user_id;
        // For links: use identified_user_id for identified users, device ID for anonymous
        const linkId = isIdentified ? identifiedUserId : info.getValue();
        const displayName = getUserDisplayName(info.row.original);
        const lastSeen = DateTime.fromSQL(info.row.original.last_seen, { zone: "utc" });

        return (
          <Link href={`/${site}/user/${linkId}`} className="flex items-center gap-2">
            <Avatar size={20} id={linkId as string} lastActiveTime={lastSeen} />
            <span className="max-w-32 truncate hover:underline" title={displayName}>
              {displayName}
            </span>
            {isIdentified && <IdentifiedBadge traits={info.row.original.traits} />}
          </Link>
        );
      },
    }),
    columnHelper.accessor("country", {
      header: "Country",
      cell: info => {
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <CountryFlag country={info.getValue() || ""} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{info.getValue() ? getCountryName(info.getValue()) : "Unknown"}</p>
              </TooltipContent>
            </Tooltip>
            {info.row.original.city || info.row.original.region || getCountryName(info.getValue())}
          </div>
        );
      },
    }),
    columnHelper.accessor("referrer", {
      header: "Channel",
      cell: info => {
        const channel = info.row.original.channel;
        const referrer = info.getValue();
        const domain = extractDomain(referrer);

        if (domain) {
          const displayName = getDisplayName(domain);
          return (
            <div className="flex items-center gap-2">
              <Favicon domain={domain} className="w-4 h-4" />
              <span>{displayName}</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <ChannelIcon channel={channel} />
            <span>{channel}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("browser", {
      header: "Browser",
      cell: info => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Browser browser={info.getValue() || "Unknown"} />
          {info.getValue() || "Unknown"}
        </div>
      ),
    }),
    columnHelper.accessor("operating_system", {
      header: "OS",
      cell: info => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <OperatingSystem os={info.getValue() || ""} />
          {info.getValue() || "Unknown"}
        </div>
      ),
    }),
    columnHelper.accessor("device_type", {
      header: "Device",
      cell: info => {
        const deviceType = info.getValue();
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {deviceType === "Desktop" && <Monitor className="w-4 h-4" />}
            {deviceType === "Mobile" && <Smartphone className="w-4 h-4" />}
            {deviceType === "Tablet" && <Tablet className="w-4 h-4" />}
            {deviceType}
          </div>
        );
      },
    }),
    columnHelper.accessor("pageviews", {
      header: ({ column }) => <SortHeader column={column}>Pageviews</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),
    columnHelper.accessor("events", {
      header: ({ column }) => <SortHeader column={column}>Events</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),
    columnHelper.accessor("sessions", {
      header: ({ column }) => <SortHeader column={column}>Sessions</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),

    columnHelper.accessor("last_seen", {
      header: ({ column }) => <SortHeader column={column}>Last Seen</SortHeader>,
      cell: info => {
        const date = DateTime.fromSQL(info.getValue(), {
          zone: "utc",
        }).setZone(getTimezone());
        const formattedDate = date.toLocaleString(DateTime.DATETIME_SHORT);
        const relativeTime = formatRelativeTime(info.getValue());

        return (
          <div className="whitespace-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{relativeTime}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formattedDate}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    }),
    columnHelper.accessor("first_seen", {
      header: ({ column }) => <SortHeader column={column}>First Seen</SortHeader>,
      cell: info => {
        const date = DateTime.fromSQL(info.getValue(), {
          zone: "utc",
        }).setZone(getTimezone());
        const formattedDate = date.toLocaleString(DateTime.DATETIME_SHORT);
        const relativeTime = formatRelativeTime(info.getValue());

        return (
          <div className="whitespace-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{relativeTime}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formattedDate}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    }),
  ];

  // Set up table instance
  const table = useReactTable({
    data: data?.data || [],
    columns,
    pageCount: data?.totalCount ? Math.ceil(data.totalCount / pagination.pageSize) : -1,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    sortDescFirst: true,
  });

  if (isError) {
    return (
      <ErrorState
        title="Failed to load users"
        message="There was a problem fetching the users. Please try again later."
      />
    );
  }

  return (
    <DisabledOverlay message="Users" featurePath="users">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={USER_PAGE_FILTERS} />
        <div className="flex items-center justify-end gap-2">
          <Switch id="identified-only" checked={identifiedOnly} onCheckedChange={setIdentifiedOnly} />
          <Label htmlFor="identified-only" className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
            Identified only
          </Label>
        </div>
        <div className="rounded-md border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-850 text-neutral-500 dark:text-neutral-400 ">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-3 py-1 font-medium whitespace-nowrap"
                        style={{
                          minWidth: header.id === "user_id" ? "100px" : "auto",
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 15 }).map((_, index) => (
                    <tr key={index} className="border-b border-neutral-100 dark:border-neutral-800 animate-pulse">
                      {Array.from({ length: columns.length }).map((_, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-3">
                          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-3 py-8 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => {
                    // Use identified_user_id for identified users, device ID (user_id) for anonymous
                    const linkId = row.original.identified_user_id || row.original.user_id;
                    const href = `/${site}/user/${linkId}`;

                    return (
                      <tr key={row.id} className="border-b border-neutral-100 dark:border-neutral-800 group">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-3 py-3 relative">
                            {/* <Link
                              href={href}
                              className="absolute inset-0 z-10"
                              aria-label={`View user ${userId}`}
                            >
                              <span className="sr-only">View user details</span>
                            </Link> */}
                            <span className="relative z-0">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            <div className="px-4 py-3">
              <Pagination
                table={table}
                data={{ items: data?.data || [], total: data?.totalCount || 0 }}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                itemName="users"
              />
            </div>
          </div>
        </div>
      </div>
    </DisabledOverlay>
  );
}
