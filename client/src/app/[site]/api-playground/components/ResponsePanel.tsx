"use client";

import { CodeSnippet } from "@/components/CodeSnippet";
import { XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { usePlaygroundStore } from "../hooks/usePlaygroundStore";
import { CodeGenConfig } from "../utils/codeGenerators";
import { CodeExamples } from "./CodeExamples";
import { BACKEND_URL } from "../../../../lib/const";

export function ResponsePanel() {
  const params = useParams();
  const siteId = params.site as string;

  const {
    selectedEndpoint,
    startDate,
    endDate,
    timeZone,
    filters,
    endpointParams,
    pathParams,
    requestBody,
    response,
    responseError,
    responseTime,
  } = usePlaygroundStore();

  // Build the full URL and query params for code generation
  const { queryParams, parsedBody } = useMemo(() => {
    if (!selectedEndpoint) {
      return { queryParams: {}, parsedBody: undefined };
    }

    // Build query params
    const qp: Record<string, any> = {};

    if (selectedEndpoint.hasCommonParams) {
      qp.start_date = startDate;
      qp.end_date = endDate;
      qp.time_zone = timeZone;

      // Convert filters to API format inline
      const apiFilters = filters
        .filter(f => f.value.trim() !== "")
        .map(f => ({
          parameter: f.parameter,
          type: f.operator,
          value: [f.value],
        }));
      if (apiFilters.length > 0) {
        qp.filters = JSON.stringify(apiFilters);
      }
    }

    // Add endpoint-specific params
    if (selectedEndpoint.specificParams) {
      for (const param of selectedEndpoint.specificParams) {
        if (endpointParams[param]) {
          qp[param] = endpointParams[param];
        }
      }
    }

    // Parse request body
    let body: any;
    if (selectedEndpoint.hasRequestBody && requestBody) {
      try {
        body = JSON.parse(requestBody);
      } catch {
        // Invalid JSON, will be handled during request
      }
    }

    return { queryParams: qp, parsedBody: body };
  }, [selectedEndpoint, startDate, endDate, timeZone, filters, endpointParams, requestBody]);

  // Code generation config
  const codeConfig: CodeGenConfig = useMemo(() => {
    if (!selectedEndpoint) {
      return {
        method: "GET",
        url: "",
        queryParams: {},
      };
    }

    let path = selectedEndpoint.path.replace(":site", siteId);
    if (selectedEndpoint.pathParams) {
      for (const param of selectedEndpoint.pathParams) {
        path = path.replace(`:${param}`, pathParams[param] || `{${param}}`);
      }
    }

    return {
      method: selectedEndpoint.method,
      url: `${BACKEND_URL}${path}`,
      queryParams,
      body: parsedBody,
    };
  }, [selectedEndpoint, siteId, pathParams, queryParams, parsedBody]);

  if (!selectedEndpoint) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 p-4">
        <p className="text-sm text-center">Select an endpoint to see the request URL and code examples</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4 space-y-4 min-w-0">
      {/* Code Examples */}
      <CodeExamples config={codeConfig} />

      {/* Response */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Response
          </h3>
          {responseTime !== null && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{responseTime}ms</span>
          )}
        </div>

        {responseError ? (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{responseError}</p>
            </div>
          </div>
        ) : response ? (
          <div className="max-h-[400px] overflow-auto rounded-lg">
            <CodeSnippet code={JSON.stringify(response, null, 2)} language="json" />
          </div>
        ) : (
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-xs text-neutral-500 dark:text-neutral-400">
            Click &quot;Execute Request&quot; to see the response
          </div>
        )}
      </div>
    </div>
  );
}
