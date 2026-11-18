import type { DpaCustomerDetails } from "@rybbit/shared";
import { BACKEND_URL } from "../../../lib/const";
import { authedFetch } from "../../utils";

export type DpaAgreement = DpaCustomerDetails & {
  id: string;
  dpaVersion: string;
  /** ISO timestamp, UTC. */
  signedAt: string;
};

export type DpaAgreementsResponse = {
  currentVersion: string;
  /** False until Rybbit's countersignature details are filled in. */
  signingAvailable: boolean;
  /** Newest first. */
  agreements: DpaAgreement[];
};

export type SignDpaInput = DpaCustomerDetails & {
  dpaVersion: string;
  agreed: true;
};

export type SignDpaResponse = {
  agreement: DpaAgreement;
  /** Whether the PDF went out by email; when false the signer downloads it instead. */
  emailed: boolean;
};

export function fetchDpaAgreements(organizationId: string) {
  return authedFetch<DpaAgreementsResponse>(`/organizations/${organizationId}/dpa`);
}

export function signDpa(organizationId: string, data: SignDpaInput) {
  return authedFetch<SignDpaResponse>(`/organizations/${organizationId}/dpa`, undefined, {
    method: "POST",
    data,
    headers: { "Content-Type": "application/json" },
  });
}

/** A plain link target: the session cookie authorizes the download. */
export function dpaPdfUrl(organizationId: string, agreementId: string) {
  return `${BACKEND_URL}/organizations/${organizationId}/dpa/${agreementId}/pdf`;
}
