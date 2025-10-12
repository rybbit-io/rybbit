import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, organization } from "better-auth/plugins";
import dotenv from "dotenv";
import { asc, eq } from "drizzle-orm";
import pg from "pg";

import { db } from "../db/postgres/postgres.js";
import * as schema from "../db/postgres/schema.js";
import { user } from "../db/postgres/schema.js";
import { DISABLE_SIGNUP } from "./const.js";
import { sendEmail, sendInvitationEmail } from "./email/email.js";

dotenv.config();

type AuthType = ReturnType<typeof betterAuth> | null;

const pluginList = [
  admin(),
  organization({
    // Allow users to create organizations
    allowUserToCreateOrganization: true,
    // Set the creator role to owner
    creatorRole: "owner",
    sendInvitationEmail: async invitation => {
      const inviteLink = `${process.env.BASE_URL}/invitation?invitationId=${invitation.invitation.id}&organization=${invitation.organization.name}&inviterEmail=${invitation.inviter.user.email}`;
      await sendInvitationEmail(
        invitation.email,
        invitation.inviter.user.email,
        invitation.organization.name,
        inviteLink
      );
    },
  }),
  emailOTP({
    async sendVerificationOTP({ email, otp, type }) {
      let subject, htmlContent;

      if (type === "sign-in") {
        subject = "Your Rybbit Sign-In Code";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Your Sign-In Code</h2>
            <p>Here is your one-time password to sign in to Rybbit:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      } else if (type === "email-verification") {
        subject = "Verify Your Email Address";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h2>
            <p>Here is your verification code for Rybbit:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      } else if (type === "forget-password") {
        subject = "Reset Your Password";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h2>
            <p>You requested to reset your password for Rybbit. Here is your one-time password:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      }

      if (subject && htmlContent) {
        await sendEmail(email, subject, htmlContent);
      }
    },
  }),
];

export let auth: AuthType | null = betterAuth({
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
        after: async () => {
          const users = await db.select().from(schema.user).orderBy(asc(user.createdAt));

          // If this is the first user, make them an admin
          if (users.length === 1) {
            await db.update(user).set({ role: "admin" }).where(eq(user.id, users[0].id));
          }
        },
      },
    },
  },
});

export function initAuth(allowedOrigins: string[]) {
  auth = betterAuth({
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        // Map our schema tables to what better-auth expects
        user: schema.user,
        account: schema.account,
        session: schema.session,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
      },
    }),
    experimental: {
      sessionCookie: {
        domains: allowedOrigins,
      },
    },
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
      // twitter: {
      //   clientId: process.env.TWITTER_CLIENT_ID!,
      //   clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      // },
    },
    user: {
      additionalFields: {
        sendAutoEmailReports: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: true,
        },
      },
      changeEmail: {
        enabled: true,
      },
    },
    plugins: pluginList,
    trustedOrigins: allowedOrigins,
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async () => {
            const users = await db.select().from(schema.user).orderBy(asc(user.createdAt));

            // If this is the first user, make them an admin
            if (users.length === 1) {
              await db.update(user).set({ role: "admin" }).where(eq(user.id, users[0].id));
            }
          },
        },
      },
    },
  });
}
