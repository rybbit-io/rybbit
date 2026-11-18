import { useMutation } from "@tanstack/react-query";
import { signDpa, type SignDpaInput } from "../endpoints/dpa";

export function useSignDpa() {
  return useMutation({
    mutationFn: ({ organizationId, data }: { organizationId: string; data: SignDpaInput }) =>
      signDpa(organizationId, data),
  });
}
