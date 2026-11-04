import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";

const TRUSTED_DEVICE_IDENTIFIER_PREFIX = "trust-device-";
export const TRUSTED_DEVICE_IDENTIFIER_PATTERN = `${TRUSTED_DEVICE_IDENTIFIER_PREFIX}%`;

export function createTwoFactorPlugins() {
  return [
    twoFactor(),
    {
      id: "rybbit-two-factor",
      hooks: {
        before: [
          {
            // emailOTP also registers /sign-in/email-otp, which the twoFactor plugin doesn't challenge.
            // Refused like a wrong code, so the response doesn't reveal who has two-factor on.
            matcher: (ctx: { path?: string }) => ctx.path === "/sign-in/email-otp",
            handler: createAuthMiddleware(async ctx => {
              const email = (ctx.body as { email?: unknown } | undefined)?.email;
              if (typeof email !== "string") return;
              const found = await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase());
              const user = found?.user as { twoFactorEnabled?: boolean | null } | undefined;
              if (user?.twoFactorEnabled) {
                throw new APIError("BAD_REQUEST", { code: "INVALID_OTP", message: "Invalid OTP" });
              }
            }),
          },
        ],
        after: [
          {
            // The plugin only revokes the trusted device that calls /two-factor/disable.
            matcher: (ctx: { path?: string }) => ctx.path === "/two-factor/disable",
            handler: createAuthMiddleware(async ctx => {
              const userId = ctx.context.session?.user.id;
              if (!userId || ctx.context.returned instanceof Error) return;
              await ctx.context.adapter.deleteMany({
                model: "verification",
                where: [
                  { field: "identifier", operator: "starts_with", value: TRUSTED_DEVICE_IDENTIFIER_PREFIX },
                  { field: "value", value: userId },
                ],
              });
            }),
          },
        ],
      },
    },
  ];
}
