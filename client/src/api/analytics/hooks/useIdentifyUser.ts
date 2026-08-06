import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { identifyUser, IdentifyUserPayload } from "../endpoints";

export function useIdentifyUser() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IdentifyUserPayload) => identifyUser(site, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
    },
  });
}
