"use client";

import type { FeatureFlagRuntime, FeatureFlagType } from "@/api/analytics/endpoints";
import { useExtracted } from "next-intl";
import { useCallback } from "react";
import type { RuleField, RuleOperator } from "./types";

export function useFlagTypeLabel() {
  const t = useExtracted();

  return useCallback(
    (flagType: FeatureFlagType) => {
      switch (flagType) {
        case "boolean":
          return t("Boolean");
        case "multivariate":
          return t("Multiple variants");
        case "remote_config":
          return t("Remote config");
      }
    },
    [t]
  );
}

export function useRuntimeLabel() {
  const t = useExtracted();

  return useCallback(
    (runtime: FeatureFlagRuntime) => {
      switch (runtime) {
        case "client":
          return t("Client");
        case "server":
          return t("Server");
        case "both":
          return t("Both");
      }
    },
    [t]
  );
}

export function useRuleFieldLabel() {
  const t = useExtracted();

  return useCallback(
    (field: RuleField) => {
      switch (field) {
        case "hostname":
          return t("Hostname");
        case "pathname":
          return t("Pathname");
        case "query":
          return t("Query parameter");
        case "referrer":
          return t("Referrer");
        case "language":
          return t("Language");
        case "country":
          return t("Country");
        case "region":
          return t("Region");
        case "city":
          return t("City");
        case "device_type":
          return t("Device type");
        case "user_id":
          return t("User ID");
        case "trait":
          return t("User trait");
      }
    },
    [t]
  );
}

export function useRuleOperatorLabel() {
  const t = useExtracted();

  return useCallback(
    (operator: RuleOperator) => {
      switch (operator) {
        case "equals":
          return t("Equals");
        case "not_equals":
          return t("Does not equal");
        case "contains":
          return t("Contains");
        case "starts_with":
          return t("Starts with");
        case "ends_with":
          return t("Ends with");
        case "regex":
          return t("Regex");
      }
    },
    [t]
  );
}
