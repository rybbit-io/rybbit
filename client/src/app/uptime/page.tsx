"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UptimePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/uptime/monitors");
  }, [router]);

  return null;
}
