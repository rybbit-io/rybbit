import { createHash } from "node:crypto";

// Matches Better Auth 1.7's organization adapter. Direct team writes must
// maintain the same membership identity as writes through the auth API.
export function teamMembershipKey(teamId: string, userId: string): string {
  return createHash("sha256")
    .update(JSON.stringify([teamId, userId]))
    .digest("base64url");
}
