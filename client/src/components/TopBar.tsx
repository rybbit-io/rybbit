"use client";

import { useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import { DEMO_HOSTNAME, IS_CLOUD } from "../lib/const";

export function TopBar() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className="flex py-2 pr-3 pl-6 items-center w-full  bg-neutral-950 justify-center border-b border-neutral-750">
      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center space-x-4">
          <Link href={session ? "/" : "https://rybbit.io"}>
            <Image src="/rybbit-text.svg" alt="Rybbit" width={100} height={22} />
          </Link>
        </div>
        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1 text-xs font-medium px-2 py-0"
              variant="ghost"
              size="xs"
            >
              <User className="w-4 h-4" />
              {session?.user.name}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href="/account" passHref>
                <DropdownMenuItem>Account</DropdownMenuItem>
              </Link>
              <Link href="/organization/members" passHref>
                <DropdownMenuItem>Organization</DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                onClick={async () => {
                  // Clear the query cache before signing out
                  queryClient.clear();
                  await authClient.signOut();
                  router.push("/login");
                }}
              >
                Sign out
              </DropdownMenuItem>
              {session?.user.role === "admin" && IS_CLOUD && (
                <Link href="/admin" passHref>
                  <DropdownMenuItem>Admin</DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : isPending ? (
          <Skeleton className="w-20 h-4 mr-2" />
        ) : (
          <Link
            href={
              typeof window !== "undefined" && globalThis.location.hostname === DEMO_HOSTNAME
                ? "https://app.rybbit.io/signup"
                : "/signup"
            }
            passHref
          >
            <Button variant="ghost" size="xs">
              Sign up
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
