"use client";

import { authedFetch } from "@/api/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play } from "lucide-react";
import { useParams } from "next/navigation";
import { usePlaygroundStore } from "../hooks/usePlaygroundStore";
import { methodColors, parameterMetadata } from "../utils/endpointConfig";
import { FilterBuilder } from "./FilterBuilder";
import { TimezoneSelect } from "./TimezoneSelect";
import { RequestBodyEditor } from "./RequestBodyEditor";

export function ParameterControls() {
  const params = useParams();
  const siteId = params.site as string;

  const {
    selectedEndpoint,
    startDate,
    endDate,
    timeZone,
    filters,
    setStartDate,
    setEndDate,
    endpointParams,
    setEndpointParam,
    pathParams,
    setPathParam,
    requestBody,
    isLoading,
    setResponse,
    setResponseError,
    setIsLoading,
  } = usePlaygroundStore();

  // Handle execute request
  const handleExecute = async () => {
    if (!selectedEndpoint) return;

    // Validate path params
    if (selectedEndpoint.pathParams) {
      for (const param of selectedEndpoint.pathParams) {
        if (!pathParams[param]) {
          setResponseError(`Missing required path parameter: ${param}`);
          return;
        }
      }
    }

    // Validate required query params
    if (selectedEndpoint.requiredParams) {
      for (const param of selectedEndpoint.requiredParams) {
        if (!endpointParams[param]) {
          setResponseError(`Missing required parameter: ${param}`);
          return;
        }
      }
    }

    // Parse request body
    let parsedBody: any;
    if (selectedEndpoint.hasRequestBody && requestBody) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setResponseError("Invalid JSON in request body");
        return;
      }
    }

    setIsLoading(true);
    const startTime = performance.now();

    try {
      // Build the path
      let path = selectedEndpoint.path.replace(":site", siteId);
      if (selectedEndpoint.pathParams) {
        for (const param of selectedEndpoint.pathParams) {
          path = path.replace(`:${param}`, pathParams[param]);
        }
      }

      // Build query params
      const queryParams: Record<string, any> = {};

      if (selectedEndpoint.hasCommonParams) {
        queryParams.start_date = startDate;
        queryParams.end_date = endDate;
        queryParams.time_zone = timeZone;

        const apiFilters = filters
          .filter(f => f.value.trim() !== "")
          .map(f => ({
            parameter: f.parameter,
            type: f.operator,
            value: [f.value],
          }));
        if (apiFilters.length > 0) {
          queryParams.filters = JSON.stringify(apiFilters);
        }
      }

      // Add endpoint-specific params
      if (selectedEndpoint.specificParams) {
        for (const param of selectedEndpoint.specificParams) {
          if (endpointParams[param]) {
            queryParams[param] = endpointParams[param];
          }
        }
      }

      // Make the request
      const result = await authedFetch<any>(
        path,
        queryParams,
        selectedEndpoint.method !== "GET"
          ? {
              method: selectedEndpoint.method,
              data: parsedBody,
            }
          : undefined
      );

      const endTime = performance.now();
      setResponse(result, Math.round(endTime - startTime));
    } catch (err: any) {
      setResponseError(err.message || "Request failed");
    }
  };

  if (!selectedEndpoint) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 p-4">
        <p className="text-sm text-center">Select an endpoint from the list to configure parameters</p>
      </div>
    );
  }

  // Format path with highlighted parameters
  const formatPath = (path: string) => {
    // Replace :site with actual siteId
    let displayPath = path.replace(":site", siteId);

    // Split by path parameters (e.g., :param) and render them differently
    const parts = displayPath.split(/(:[\w]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith(":")) {
        const paramName = part.slice(1);
        const value = pathParams[paramName];
        return (
          <span
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-mono"
          >
            {value || `{${paramName}}`}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{selectedEndpoint.name}</h2>
          {selectedEndpoint.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedEndpoint.description}</p>
          )}
        </div>

        {/* Method + Path + Try it button */}
        <div className="flex items-center gap-2 p-1 border border-neutral-100 rounded-[8px] dark:border-neutral-800">
          <div className="flex items-center gap-2 border border-neutral-100 dark:border-neutral-800 rounded-[6px] p-1 flex-1">
            {/* Method Badge */}
            <span className={`shrink-0 px-1.5 py-1 text-xs font-bold rounded ${methodColors[selectedEndpoint.method]}`}>
              {selectedEndpoint.method}
            </span>

            {/* Path */}
            <div className="flex-1 min-w-0 text-sm text-neutral-900 dark:text-neutral-100 font-mono truncate">
              {formatPath(selectedEndpoint.path)}
            </div>
          </div>

          {/* Try it button */}
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Run
                <Play className="h-3.5 w-3.5 fill-current" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Path Parameters */}
      {selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Path Parameters
          </h3>
          {selectedEndpoint.pathParams.map(param => {
            const meta = parameterMetadata[param];
            return (
              <div key={param} className="space-y-1">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {meta?.label || param}
                </label>
                <Input
                  value={pathParams[param] || ""}
                  onChange={e => setPathParam(param, e.target.value)}
                  placeholder={meta?.placeholder || `Enter ${param}`}
                  className="h-8 text-xs"
                  type={meta?.type === "number" ? "number" : "text"}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Common Parameters */}
      {selectedEndpoint.hasCommonParams && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Time Range
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">End Date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <TimezoneSelect />
          <FilterBuilder />
        </div>
      )}

      {/* Endpoint-Specific Parameters */}
      {selectedEndpoint.specificParams && selectedEndpoint.specificParams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {selectedEndpoint.hasCommonParams ? "Additional Parameters" : "Parameters"}
          </h3>
          {selectedEndpoint.specificParams.map(param => {
            const meta = parameterMetadata[param];
            const isRequired = selectedEndpoint.requiredParams?.includes(param);
            if (!meta) {
              return (
                <div key={param} className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {param}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Input
                    value={endpointParams[param] || ""}
                    onChange={e => setEndpointParam(param, e.target.value)}
                    placeholder={`Enter ${param}`}
                    className="h-8 text-xs"
                  />
                </div>
              );
            }

            if (meta.type === "select" && meta.options) {
              return (
                <div key={param} className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {meta.label}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Select value={endpointParams[param] || ""} onValueChange={value => setEndpointParam(param, value)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={`Select ${meta.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.options.map(opt => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return (
              <div key={param} className="space-y-1">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {meta.label}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <Input
                  type={meta.type === "number" ? "number" : "text"}
                  value={endpointParams[param] || ""}
                  onChange={e => setEndpointParam(param, e.target.value)}
                  placeholder={meta.placeholder || `Enter ${meta.label}`}
                  className="h-8 text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Request Body */}
      {selectedEndpoint.hasRequestBody && <RequestBodyEditor />}
    </div>
  );
}
