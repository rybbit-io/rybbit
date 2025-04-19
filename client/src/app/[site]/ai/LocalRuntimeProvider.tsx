"use client";

import { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ChatModelAdapter,
} from "@assistant-ui/react";
import { authedFetch } from "@/api/utils";
import { BACKEND_URL } from "@/lib/const";
import { DateTime } from "luxon";
import { useStore } from "@/lib/store";

export function LocalRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { site } = useStore();

  const customModelAdapter: ChatModelAdapter = {
    async run({ messages, abortSignal }) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const date = DateTime.now().toFormat("yyyy-MM-dd");

      const response = await authedFetch(`${BACKEND_URL}/handle-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site,
          timezone,
          date,
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
        signal: abortSignal,
      });
      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: data.response || data.error,
          },
        ],
      };
    },
  };

  const runtime = useLocalRuntime(customModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
