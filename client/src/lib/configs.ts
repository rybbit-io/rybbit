import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../api/utils";

interface Configs {
  disableSignup: boolean;
  internalAuthEnabled: boolean;
  mapboxToken: string;
  enabledOIDCProviders: Array<{
    providerId: string;
    name: string;
  }>;
  enabledSocialProviders: string[];
}

export function useConfigs() {
  const { data, isLoading, error } = useQuery<Configs>({
    queryKey: ["configs"],
    queryFn: () => authedFetch<Configs>("/config"),
  });

  return {
    configs: data,
    isLoading,
    error,
  };
}
