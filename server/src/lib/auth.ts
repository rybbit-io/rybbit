import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin, captcha, emailOTP, organization, apiKey } from "better-auth/plugins";
import dotenv from "dotenv";
import { and, asc, eq } from "drizzle-orm";
import pg from "pg";

import { db } from "../db/postgres/postgres.js";
import * as schema from "../db/postgres/schema.js";
import { invitation, member, memberSiteAccess, user } from "../db/postgres/schema.js";
import { DISABLE_SIGNUP, IS_CLOUD } from "./const.js";
import { addContactToAudience, sendInvitationEmail, sendOtpEmail, sendWelcomeEmail } from "./email/email.js";
import { onboardingTipsService } from "../services/onboardingTips/onboardingTipsService.js";

dotenv.config();

const pluginList = [
  admin(),
  apiKey(),
  organization({
    allowUserToCreateOrganization: true,
    creatorRole: "owner",
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
    },
  },
  plugins: pluginList,
  trustedOrigins: ["http://localhost:3002"],
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
        try {
          const body = ctx.body as { invitationId?: string } | null;
          const invitationId = body?.invitationId;

          if (invitationId) {
            // Query the invitation to get site access settings and org/email info
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

            if (invitationRecord.length > 0) {
              const { organizationId, email, hasRestrictedSiteAccess, siteIds } = invitationRecord[0];

              if (hasRestrictedSiteAccess) {
                // Find the user by email
                const userRecord = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);

                if (userRecord.length > 0) {
                  await db.transaction(async tx => {
                    // Find the member by organizationId + userId
                    const memberRecord = await tx
                      .select({ id: member.id })
                      .from(member)
                      .where(and(eq(member.organizationId, organizationId), eq(member.userId, userRecord[0].id)))
                      .limit(1);

                    if (memberRecord.length > 0) {
                      const memberId = memberRecord[0].id;

                      // Update member with hasRestrictedSiteAccess
                      await tx.update(member).set({ hasRestrictedSiteAccess: true }).where(eq(member.id, memberId));

                      // Insert site access entries
                      const siteIdArray = (siteIds || []) as number[];
                      if (siteIdArray.length > 0) {
                        await tx.insert(memberSiteAccess).values(
                          siteIdArray.map(siteId => ({
                            memberId: memberId,
                            siteId: siteId,
                          }))
                        );
                      }
                    }
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error copying site access from invitation to member:", error);
        }
      }
    }),
  },
});
