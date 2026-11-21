import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { updateUserTraits } from "../endpoints";

interface UpdateUserTraitsParams {
  userId: string;
  traits: Record<string, unknown>;
}

export function useUpdateUserTraits() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, traits }: UpdateUserTraitsParams) => updateUserTraits(site, userId, traits),
    onSuccess: () => {
      // Traits surface on the users list/detail, trait explorer, and the
      // session/replay cards' identified badges.
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
      queryClient.invalidateQueries({ queryKey: ["user-trait-keys"] });
      queryClient.invalidateQueries({ queryKey: ["user-trait-values"] });
      queryClient.invalidateQueries({ queryKey: ["user-trait-value-users"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions-infinite"] });
      queryClient.invalidateQueries({ queryKey: ["session-replays"] });
    },
  });
}
