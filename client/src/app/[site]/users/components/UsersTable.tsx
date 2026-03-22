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
import { addFilter, getTimezone } from "@/lib/store";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useExtracted } from "next-intl";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { useDebounce } from "@uidotdev/usehooks";
import { UsersResponse } from "../../../../api/analytics/endpoints";
import { useGetUsers } from "../../../../api/analytics/hooks/useGetUsers";
import { Avatar } from "../../../../components/Avatar";
import { ChannelIcon, extractDomain, getDisplayName } from "../../../../components/Channel";
import { ErrorState } from "../../../../components/ErrorState";
import { Favicon } from "../../../../components/Favicon";
import { IdentifiedBadge } from "../../../../components/IdentifiedBadge";
import { Pagination } from "../../../../components/pagination";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Switch } from "../../../../components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { FilterParameter } from "@rybbit/shared";
import { getCountryName, getUserDisplayName } from "../../../../lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { DeviceIcon } from "../../components/shared/icons/Device";

const columnHelper = createColumnHelper<UsersResponse>();

const handleFilterClick = (e: React.MouseEvent, parameter: FilterParameter, value: string | undefined) => {
  e.stopPropagation();
  if (!value) return;
  addFilter({
    parameter,
    value: [value],
    type: "equals",
  });
};

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

export function UsersTable() {
  const t = useExtracted();
  const { formatRelative, formatDateTime } = useDateTimeFormat();

  const formatRelativeTime = (dateStr: string) => {
    const date = DateTime.fromSQL(dateStr, { zone: "utc" }).setZone(getTimezone());
    const diff = Math.abs(date.diffNow(["minutes"]).minutes);

    if (diff < 1) {
      return "<1 min ago";
    }

    return formatRelative(date);
  };
  const { site } = useParams();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "last_seen", desc: true }]);
  const [identifiedOnly, setIdentifiedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("username");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  const effectiveIdentifiedOnly = identifiedOnly || debouncedSearch.length > 0;

  const page = pagination.pageIndex + 1;
  const sortBy = sorting.length > 0 ? sorting[0].id : "last_seen";
  const sortOrder = sorting.length > 0 && !sorting[0].desc ? "asc" : "desc";

  const { data, isLoading, isError } = useGetUsers({
    page,
    pageSize: pagination.pageSize,
    sortBy,
    sortOrder,
    identifiedOnly: effectiveIdentifiedOnly,
    search: debouncedSearch,
    searchField,
  });

  const columns = [
    columnHelper.accessor("user_id", {
      header: t("User"),
      cell: info => {
        const identifiedUserId = info.row.original.identified_user_id;
        const isIdentified = !!info.row.original.identified_user_id;
        const linkId = isIdentified ? identifiedUserId : info.getValue();
        const encodedLinkId = encodeURIComponent(linkId);
        const displayName = getUserDisplayName(info.row.original);
        const lastSeen = DateTime.fromSQL(info.row.original.last_seen, { zone: "utc" });

        return (
          <Link href={`/${site}/user/${encodedLinkId}`} className="flex items-center gap-2">
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
      header: t("Country"),
      cell: info => {
        const country = info.getValue();
        return (
          <div
            className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-70"
            onClick={e => handleFilterClick(e, "country", country)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <CountryFlag country={country || ""} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{country ? getCountryName(country) : t("Unknown")}</p>
              </TooltipContent>
            </Tooltip>
            {info.row.original.city || info.row.original.region || getCountryName(country)}
          </div>
        );
      },
    }),
    columnHelper.accessor("referrer", {
      header: t("Channel"),
      cell: info => {
        const channel = info.row.original.channel;
        const referrer = info.getValue();
        const domain = extractDomain(referrer);

        if (domain) {
          const displayName = getDisplayName(domain);
          return (
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-70"
              onClick={e => handleFilterClick(e, "channel", channel)}
            >
              <Favicon domain={domain} className="w-4 h-4" />
              <span>{displayName}</span>
            </div>
          );
        }

        return (
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-70"
            onClick={e => handleFilterClick(e, "channel", channel)}
          >
            <ChannelIcon channel={channel} />
            <span>{channel}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("browser", {
      header: t("Browser"),
      cell: info => {
        const browser = info.getValue();
        return (
          <div
            className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-70"
            onClick={e => handleFilterClick(e, "browser", browser)}
          >
            <Browser browser={browser || "Unknown"} />
            {browser || t("Unknown")}
          </div>
        );
      },
    }),
    columnHelper.accessor("operating_system", {
      header: t("OS"),
      cell: info => {
        const os = info.getValue();
        return (
          <div
            className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-70"
            onClick={e => handleFilterClick(e, "operating_system", os)}
          >
            <OperatingSystem os={os || ""} />
            {os || t("Unknown")}
          </div>
        );
      },
    }),
    columnHelper.accessor("device_type", {
      header: t("Device"),
      cell: info => {
        const deviceType = info.getValue();
        return (
          <div
            className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-70"
            onClick={e => handleFilterClick(e, "device_type", deviceType)}
          >
            <DeviceIcon deviceType={deviceType || ""} />
            {deviceType}
          </div>
        );
      },
    }),
    columnHelper.accessor("pageviews", {
      header: ({ column }) => <SortHeader column={column}>{t("Pageviews")}</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),
    columnHelper.accessor("events", {
      header: ({ column }) => <SortHeader column={column}>{t("Events")}</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),
    columnHelper.accessor("sessions", {
      header: ({ column }) => <SortHeader column={column}>{t("Sessions")}</SortHeader>,
      cell: info => <div className="whitespace-nowrap">{info.getValue().toLocaleString()}</div>,
    }),
    columnHelper.accessor("last_seen", {
      header: ({ column }) => <SortHeader column={column}>{t("Last Seen")}</SortHeader>,
      cell: info => {
        const date = DateTime.fromSQL(info.getValue(), {
          zone: "utc",
        }).setZone(getTimezone());
        const formattedDate = formatDateTime(date, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
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
      header: ({ column }) => <SortHeader column={column}>{t("First Seen")}</SortHeader>,
      cell: info => {
        const date = DateTime.fromSQL(info.getValue(), {
          zone: "utc",
        }).setZone(getTimezone());
        const formattedDate = formatDateTime(date, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
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
        title={t("Failed to load users")}
        message={t("There was a problem fetching the users. Please try again later.")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="flex max-w-sm">
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="w-[110px] shrink-0 rounded-r-none border-r-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="username">{t("Username")}</SelectItem>
              <SelectItem value="name">{t("Name")}</SelectItem>
              <SelectItem value="email">{t("Email")}</SelectItem>
              <SelectItem value="user_id">{t("User ID")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={t("Search by {field}...", { field: searchField === "user_id" ? t("user ID") : searchField })}
            className="rounded-l-none"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="identified-only"
            checked={effectiveIdentifiedOnly}
            onCheckedChange={setIdentifiedOnly}
            disabled={debouncedSearch.length > 0}
          />
          <Label htmlFor="identified-only" className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
            {t("Identified only")}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="https://www.rybbit.io/docs/identify-users" target="_blank">
                <Info className="h-4 w-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("Learn how to identify users")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
                    {t("No users found")}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const linkId = row.original.identified_user_id || row.original.user_id;
                  const href = `/${site}/user/${encodeURIComponent(linkId)}`;

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
  );
}
