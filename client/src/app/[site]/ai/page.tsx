"use client";

import { ThreadList } from "@/components/ui/assistant-ui/thread-list";
import { Thread } from "@/components/ui/assistant-ui/thread";
import { LocalRuntimeProvider } from "./LocalRuntimeProvider";

export default function AIPage() {
  return (
    <LocalRuntimeProvider>
      <div className="grid h-[calc(100vh-80px)] grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </LocalRuntimeProvider>
  );
}
