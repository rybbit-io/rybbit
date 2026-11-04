import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";

/**
 * Two-factor authentication for password sign-in.
 *
 * Better Auth's twoFactor plugin challenges /sign-in/email only (plus the
 * username and phone-number sign-ins, which Rybbit doesn't enable). Google
 * and GitHub sign-in are left to the identity provider's own 2FA.
 *
 * Methods: authenticator apps (TOTP) and backup codes. There is no
 * otpOptions.sendOTP, because self-hosted instances often can't send email;
 * /two-factor/enable with method "otp" fails with OTP_NOT_CONFIGURED.
 */
export function createTwoFactorPlugins() {
  return [
    twoFactor(),
    {
      id: "rybbit-two-factor",
      hooks: {
        before: [
          {
            // The emailOTP plugin (Rybbit uses it for password reset) also
            // registers /sign-in/email-otp, which hands out a session on an
            // emailed code alone and is outside the twoFactor plugin's
            // challenge. No Rybbit client calls it; refuse it for accounts
            // with two-factor on, so email access alone can't sign them in.
            matcher: (ctx: { path?: string }) => ctx.path === "/sign-in/email-otp",
            handler: createAuthMiddleware(async ctx => {
              const email = (ctx.body as { email?: unknown } | undefined)?.email;
              if (typeof email !== "string") return; // the endpoint rejects a malformed body itself
              const found = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase());
              const user = found?.user as { twoFactorEnabled?: boolean | null } | undefined;
              if (user?.twoFactorEnabled) {
                // The endpoint's own answer to a wrong code, so the response
                // doesn't say which accounts have two-factor on.
                throw new APIError("BAD_REQUEST", { code: "INVALID_OTP", message: "Invalid OTP" });
              }
            }),
          },
        ],
      },
    },
  ];
}
