"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface UserTableSkeletonProps {
  rowCount?: number;
}

export function UserTableSkeleton({ rowCount = 10 }: UserTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <TableRow key={index}>
          {/* User (name + email) */}
          <TableCell>
            <div className="space-y-1 py-0.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </TableCell>
          {/* Role */}
          <TableCell>
            <Skeleton className="h-4 w-12" />
          </TableCell>
          {/* Created */}
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          {/* User ID */}
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          {/* Actions */}
          <TableCell>
            <Skeleton className="ml-auto h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
