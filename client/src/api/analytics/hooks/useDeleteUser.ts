import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { deleteUser } from "../endpoints";

interface DeleteUserParams {
  userId: string;
}

export function useDeleteUser() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: DeleteUserParams) => deleteUser(site, userId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.removeQueries({ queryKey: ["user-info", userId] });
    },
  });
}
