import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth";

export function useSignout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async () => {
    queryClient.clear();
    await authClient.signOut();
    router.push("/login");
  };
}
