"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, MoreHorizontal } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { toast } from "sonner";
import {
  UptimeIncident,
  useAcknowledgeIncident,
  useIncidents,
  useResolveIncident,
} from "../../../api/uptime/incidents";

const formatStartTime = (timestamp: string) => {
  const dt = DateTime.fromSQL(timestamp, { zone: "UTC" }).setZone(getTimezone());
  return dt.toRelative() || dt.toFormat("MMM dd, HH:mm");
};

const getStatusIcon = (status: UptimeIncident["status"]) => {
  switch (status) {
    case "active":
      return (
        <div className="p-2 rounded-lg bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
      );
    case "acknowledged":
      return (
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        </div>
      );
    case "resolved":
      return (
        <div className="p-2 rounded-lg bg-green-500/10">
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
      );
  }
};

const formatDuration = (startTime: string, endTime: string | null): string => {
  const start = DateTime.fromSQL(startTime, { zone: "UTC" });
  const end = endTime ? DateTime.fromSQL(endTime, { zone: "UTC" }) : DateTime.now().toUTC();
  const diff = end.diff(start, ["days", "hours", "minutes", "seconds"]);

  const days = Math.floor(diff.days);
  const hours = Math.floor(diff.hours);
  const minutes = Math.floor(diff.minutes);
  const seconds = Math.floor(diff.seconds);

  let result = "";
  if (days > 0) {
    result = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    result = `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    result = `${minutes}m`;
  } else {
    result = `${seconds}s`;
  }

  return endTime ? result : `${result} (ongoing)`;
};

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<"active" | "acknowledged" | "resolved" | "all">("active");

  const { data, isLoading } = useIncidents({ status: statusFilter });

  const acknowledgeIncident = useAcknowledgeIncident();
  const resolveIncident = useResolveIncident();

  const handleAcknowledge = async (incident: UptimeIncident) => {
    try {
      await acknowledgeIncident.mutateAsync(incident.id);
      toast.success("Incident acknowledged");
    } catch (error) {
      toast.error("Failed to acknowledge incident");
    }
  };

  const handleResolve = async (incident: UptimeIncident) => {
    try {
      await resolveIncident.mutateAsync(incident.id);
      toast.success("Incident resolved");
    } catch (error) {
      toast.error("Failed to resolve incident");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Incidents</h1>

        <Tabs value={statusFilter} onValueChange={value => setStatusFilter(value as any)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-lg border border-neutral-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Monitor Name</TableHead>
              <TableHead>Affected Regions</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.incidents?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
                  No incidents found
                </TableCell>
              </TableRow>
            ) : (
              data?.incidents?.map(incident => (
                <TableRow key={incident.id}>
                  <TableCell>{getStatusIcon(incident.status)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{incident.monitorName}</div>
                  </TableCell>
                  <TableCell>
                    {incident.affectedRegions && incident.affectedRegions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {incident.affectedRegions.length > 3 ? (
                          <>
                            {incident.affectedRegions.slice(0, 3).map(region => (
                              <span
                                key={region}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                  region === "global" ? "bg-red-500/20 text-red-400" : "bg-neutral-700 text-neutral-300"
                                )}
                              >
                                {region.toUpperCase()}
                              </span>
                            ))}
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-700 text-neutral-300">
                              +{incident.affectedRegions.length - 3} more
                            </span>
                          </>
                        ) : (
                          incident.affectedRegions.map(region => (
                            <span
                              key={region}
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                region === "global" ? "bg-red-500/20 text-red-400" : "bg-neutral-700 text-neutral-300"
                              )}
                            >
                              {region.toUpperCase()}
                            </span>
                          ))
                        )}
                      </div>
                    ) : incident.region ? (
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                          incident.region === "global"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-neutral-700 text-neutral-300"
                        )}
                      >
                        {incident.region.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-300">{formatStartTime(incident.startTime)}</TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-300">
                      {formatDuration(incident.startTime, incident.endTime || null)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild disabled={incident.status === "resolved"}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {incident.status === "active" && (
                          <DropdownMenuItem onClick={() => handleAcknowledge(incident)}>Acknowledge</DropdownMenuItem>
                        )}
                        {incident.status !== "resolved" && (
                          <DropdownMenuItem onClick={() => handleResolve(incident)}>Resolve</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
