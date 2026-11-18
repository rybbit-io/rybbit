import type { DpaCustomerDetails } from "@rybbit/shared";
import { authedFetch } from "../../utils";

export type SignDpaInput = DpaCustomerDetails & {
  dpaVersion: string;
  agreed: true;
};

export type SignDpaResponse = {
  filename: string;
  /** The countersigned PDF, base64. Rybbit keeps no copy, so this is the one to download. */
  pdf: string;
  /** Whether the PDF also went out by email. */
  emailed: boolean;
};

export function signDpa(organizationId: string, data: SignDpaInput) {
  return authedFetch<SignDpaResponse>(`/organizations/${organizationId}/dpa`, undefined, {
    method: "POST",
    data,
    headers: { "Content-Type": "application/json" },
  });
}
