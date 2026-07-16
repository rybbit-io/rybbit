import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, captcha, emailOTP, mcp, organization } from "better-auth/plugins";
import { ALL_SCOPE_STRINGS, OIDC_STANDARD_SCOPES } from "./scopes.js";
import dotenv from "dotenv";
import { and, asc, eq, inArray } from "drizzle-orm";
import pg from "pg";
import { dash } from "@better-auth/infra";
import { apiKey } from "@better-auth/api-key"

import { db } from "../db/postgres/postgres.js";
import * as schema from "../db/postgres/schema.js";
import { invitation, member, memberSiteAccess, sites, user } from "../db/postgres/schema.js";
import { invalidateSitesAccessCache } from "./auth-utils.js";
import { API_RATE_LIMIT_WINDOW, DISABLE_SIGNUP, IS_CLOUD, STANDARD_API_RATE_LIMIT } from "./const.js";
import {
  addContactToAudience,
  sendChangeEmailVerification,
  sendEmailVerificationLink,
  sendInvitationEmail,
  sendOtpEmail,
  sendWelcomeEmail,
} from "./email/email.js";
import { onboardingTipsService } from "../services/onboardingTips/onboardingTipsService.js";
import { getTrustedCorsOrigins } from "./cors.js";
import { createServiceLogger } from "./logger/logger.js";

dotenv.config();

const authLogger = createServiceLogger("better-auth");

const pluginList = [
  admin(),
  // OAuth provider for MCP clients (RFC 8414/9728 discovery, dynamic client
  // registration, authorization-code + PKCE). The root /.well-known routes are
  // registered in index.ts; token validation happens via auth.api.getMcpSession.
  mcp({
    loginPage: "/login",
    ...(process.env.BASE_URL ? { resource: `${process.env.BASE_URL.replace(/\/$/, "")}/api/mcp` } : {}),
    oidcConfig: {
      loginPage: "/login",
      // Registers the custom resource:action scopes so /mcp/authorize's
      // invalid_scope check accepts them (merged after the standard scopes).
      scopes: [...ALL_SCOPE_STRINGS],
      // Advertised metadata is NOT derived from `scopes`. This feeds the
      // RFC 9728 protected-resource document; the RFC 8414 authorization-server
      // document is augmented in mcp/wellKnown.ts (better-auth builds it from a
      // top-level option the mcp() plugin type doesn't expose).
      metadata: {
        scopes_supported: [...OIDC_STANDARD_SCOPES, ...ALL_SCOPE_STRINGS],
      },
    },
  }),
  apiKey({
    ...(IS_CLOUD
      ? {
          rateLimit: {
            enabled: true,
            timeWindow: API_RATE_LIMIT_WINDOW,
            maxRequests: STANDARD_API_RATE_LIMIT,
          },
        }
      : { rateLimit: { maxRequests: 10000, timeWindow: 86400000 } }),
  }),
  dash(),
  organization({
    allowUserToCreateOrganization: true,
    creatorRole: "owner",
    teams: {
      enabled: true,
    },
    organizationHooks: {
      beforeCreateInvitation: async ({ invitation: newInvitation }) => {
        const invite = newInvitation as typeof newInvitation & {
          hasRestrictedSiteAccess?: boolean;
          siteIds?: number[];
        };
        const hasRestrictedSiteAccess = invite.hasRestrictedSiteAccess === true;

        if (!hasRestrictedSiteAccess) {
          return {
            data: {
              hasRestrictedSiteAccess: false,
              siteIds: [],
            },
          };
        }

        if (invite.role !== "member") {
          throw new APIError("BAD_REQUEST", {
            message: "Site access restrictions can only be applied to member invitations",
          });
        }

        const uniqueSiteIds = Array.from(new Set(invite.siteIds ?? []));
        if (uniqueSiteIds.length === 0) {
          throw new APIError("BAD_REQUEST", {
            message: "At least one site is required when restricting invitation access",
          });
        }

        const validSites = await db
          .select({ siteId: sites.siteId })
          .from(sites)
          .where(and(eq(sites.organizationId, invite.organizationId), inArray(sites.siteId, uniqueSiteIds)));
        const validSiteIds = new Set(validSites.map(site => site.siteId));
        const invalidSiteIds = uniqueSiteIds.filter(siteId => !validSiteIds.has(siteId));

        if (invalidSiteIds.length > 0) {
          throw new APIError("BAD_REQUEST", {
            message: `Sites do not belong to organization: ${invalidSiteIds.join(", ")}`,
          });
        }

        return {
          data: {
            hasRestrictedSiteAccess: true,
            siteIds: uniqueSiteIds,
          },
        };
      },
      afterRemoveMember: async ({ member: removedMember, user: removedUser, organization: org }) => {
        // Clear any pending/accepted invitations for this user+org so a stale
        // invite can't be re-accepted and recreate access after removal.
        try {
          await db
            .delete(invitation)
            .where(and(eq(invitation.email, removedUser.email), eq(invitation.organizationId, org.id)));
        } catch (error) {
          console.error("Error deleting invitations for removed member:", error);
        }
        invalidateSitesAccessCache(removedMember.userId);
      },
    },
    sendInvitationEmail: async invitationData => {
      const inviteLink = `${process.env.BASE_URL}/invitation?invitationId=${invitationData.invitation.id}&organization=${invitationData.organization.name}&inviterEmail=${invitationData.inviter.user.email}`;
      await sendInvitationEmail(
        invitationData.email,
        invitationData.inviter.user.email,
        invitationData.organization.name,
        inviteLink
      );
    },
    schema: {
      invitation: {
        additionalFields: {
          hasRestrictedSiteAccess: {
            type: "boolean",
            required: false,
            defaultValue: false,
            fieldName: "has_restricted_site_access",
          },
          siteIds: {
            type: "number[]",
            required: false,
            defaultValue: [],
            fieldName: "site_ids",
          },
        },
      },
      organization: {
        additionalFields: {
          stripeCustomerId: {
            type: "string",
            required: false,
          },
          monthlyEventCount: {
            type: "number",
            required: false,
            defaultValue: 0,
          },
          overMonthlyLimit: {
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          planOverride: {
            type: "string",
            required: false,
          },
          customPlan: {
            type: "string",
            required: false,
          },
        },
      },
    },
  }),
  emailOTP({
    async sendVerificationOTP({ email, otp, type }) {
      await sendOtpEmail(email, otp, type);
    },
  }),
  // Add Cloudflare Turnstile captcha (cloud only)
  ...(IS_CLOUD && process.env.TURNSTILE_SECRET_KEY && process.env.NODE_ENV === "production"
    ? [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: process.env.TURNSTILE_SECRET_KEY,
      }),
    ]
    : []),
];

export const auth = betterAuth({
  basePath: "/api/auth",
  appName: "Rybbit",
  logger: {
    log: (level, message, ...args) => {
      // Route better-auth's internal logs (e.g. API key rate-limit errors)
      // through the project's pino logger instead of console.
      authLogger[level]({ args }, message);
    },
  },
  database: new pg.Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  }),
  emailAndPassword: {
    enabled: true,
    // Disable email verification for now
    requireEmailVerification: false,
    disableSignUp: DISABLE_SIGNUP,
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      await sendEmailVerificationLink(user.email, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      sendAutoEmailReports: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: true,
      },
      // scheduledTipEmailIds: {
      //   type: "string[]",
      //   required: false,
      //   defaultValue: [],
      // },
    },
    deleteUser: {
      enabled: true,
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({
        user,
        newEmail,
        url,
      }: {
        user: { email: string };
        newEmail: string;
        url: string;
        token: string;
      }) => {
        await sendChangeEmailVerification(user.email, newEmail, url);
      },
    },
  },
  plugins: pluginList,
  trustedOrigins: getTrustedCorsOrigins(),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production", // don't mark Secure in dev
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async u => {
          console.log(u);
          const users = await db.select().from(schema.user).orderBy(asc(user.createdAt));

          // If this is the first user, make them an admin
          if (users.length === 1) {
            await db.update(user).set({ role: "admin" }).where(eq(user.id, users[0].id));
          }

          sendWelcomeEmail(u.email, u.name);
          // Add contact to marketing audience and schedule onboarding emails
          try {
            await addContactToAudience(u.email, u.name);

            const emailIds = await onboardingTipsService.scheduleOnboardingEmails(u.email, u.name);

            // Store scheduled email IDs for potential cancellation
            if (emailIds.length > 0) {
              await db.update(user).set({ scheduledTipEmailIds: emailIds }).where(eq(user.id, u.id));
            }
          } catch (error) {
            console.error("Error setting up onboarding emails:", error);
          }
        },
      },
      update: {
        before: async userUpdate => {
          // Security: Prevent role field from being updated via regular update-user endpoint
          // Role changes should only go through the admin setRole endpoint
          if (userUpdate && typeof userUpdate === "object") {
            if ("role" in userUpdate) {
              // Remove role from the update data
              const { role: _, ...dataWithoutRole } = userUpdate;
              return {
                data: dataWithoutRole,
              };
            }
            // Always return the data, even if role wasn't present
            return {
              data: userUpdate,
            };
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (IS_CLOUD && ctx.path === "/organization/invite-member") {
        const body = ctx.body as { organizationId?: string } | undefined;
        const organizationId = body?.organizationId;

        if (organizationId) {
          // Lazy import to avoid circular dependency
          const { getSubscriptionInner } = await import("../api/stripe/getSubscription.js");
          const subscription = await getSubscriptionInner(organizationId);
          const memberLimit = subscription?.memberLimit ?? null;

          if (memberLimit !== null) {
            const members = await db
              .select({ id: member.id })
              .from(member)
              .where(eq(member.organizationId, organizationId));

            if (members.length >= memberLimit) {
              throw new APIError("FORBIDDEN", {
                message: `You have reached the limit of ${memberLimit} member${memberLimit === 1 ? "" : "s"} for your plan. Please upgrade to add more.`,
              });
            }
          }
        }
      }
    }),
    after: createAuthMiddleware(async ctx => {
      // Handle invitation acceptance - copy site access from invitation to member
      if (ctx.path === "/organization/accept-invitation") {
        const body = ctx.body as { invitationId?: string } | null;
        const invitationId = body?.invitationId;
        if (!invitationId) return;

        try {
          const invitationRecord = await db
            .select({
              organizationId: invitation.organizationId,
              email: invitation.email,
              hasRestrictedSiteAccess: invitation.hasRestrictedSiteAccess,
              siteIds: invitation.siteIds,
            })
            .from(invitation)
            .where(eq(invitation.id, invitationId))
            .limit(1);

          if (invitationRecord.length === 0) return;
          const { organizationId, email, hasRestrictedSiteAccess, siteIds } = invitationRecord[0];
          if (!hasRestrictedSiteAccess) return;

          const userRecord = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
          if (userRecord.length === 0) return;

          const memberRecord = await db
            .select({ id: member.id })
            .from(member)
            .where(and(eq(member.organizationId, organizationId), eq(member.userId, userRecord[0].id)))
            .limit(1);
          if (memberRecord.length === 0) return;
          const memberId = memberRecord[0].id;

          // Fail-safe ordering: flip the member to restricted BEFORE inserting the
          // granted-site rows. If the insert step then fails, the member is left
          // with hasRestrictedSiteAccess=true and zero rows in memberSiteAccess —
          // i.e. locked out, which is safe. The previous transaction-based
          // implementation would silently leave the member unrestricted (full
          // org access) on any failure.
          await db.update(member).set({ hasRestrictedSiteAccess: true }).where(eq(member.id, memberId));

          const siteIdArray = (siteIds || []) as number[];
          if (siteIdArray.length > 0) {
            await db.insert(memberSiteAccess).values(
              siteIdArray.map(siteId => ({
                memberId,
                siteId,
              }))
            );
          }

          invalidateSitesAccessCache(userRecord[0].id);
        } catch (error) {
          console.error("Error applying invitation site restrictions:", error);
        }
      }

      // Handle self-removal via /organization/leave. Better-auth does NOT call
      // organizationHooks.afterRemoveMember for this path, so the cleanup
      // (invitation purge + access-cache invalidation) has to live here.
      if (ctx.path === "/organization/leave") {
        try {
          const session = (ctx.context as any).session;
          const userId = session?.user?.id;
          const userEmail = session?.user?.email;
          const body = ctx.body as { organizationId?: string } | null;
          const organizationId = body?.organizationId;

          if (userId && organizationId) {
            if (userEmail) {
              await db
                .delete(invitation)
                .where(and(eq(invitation.email, userEmail), eq(invitation.organizationId, organizationId)));
            }
            invalidateSitesAccessCache(userId);
          }
        } catch (error) {
          console.error("Error cleaning up after organization leave:", error);
        }
      }
    }),
  },
});
