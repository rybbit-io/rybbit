import { PGlite } from "@electric-sql/pglite";
import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { Kysely, PostgresDialect, type PostgresPoolClient } from "kysely";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOAuthPlugins } from "./oauth.js";
import { createTwoFactorPlugins } from "./twoFactor.js";

const origin = "http://localhost:3002";
const secret = "test-only-two-factor-secret-at-least-32-characters";
const password = "strong-test-password-123";
const migrationDirectory = new URL("../../drizzle/", import.meta.url);

function totpCode(totpURI: string, at = Date.now()) {
  const base32 = new URL(totpURI).searchParams.get("secret")!.replace(/=+$/, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

function cookieJar(...responses: Response[]) {
  const jar = new Map<string, string>();
  for (const response of responses) {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      if (/max-age=0/i.test(header)) jar.delete(name);
      else jar.set(name, pair);
    }
  }
  return [...jar.values()].join("; ");
}

describe("two-factor authentication", () => {
  const database = new PGlite();
  const kysely = new Kysely({
    dialect: new PostgresDialect({
      pool: {
        connect: async () => ({
          query: (async (sql: string, parameters: unknown[]) => {
            const result = await database.query(sql, parameters);
            return {
              rows: result.rows,
              rowCount: result.affectedRows ?? result.rows.length,
              command: sql.trim().split(/\s/)[0].toUpperCase() as "SELECT" | "INSERT" | "UPDATE" | "DELETE",
            };
          }) as PostgresPoolClient["query"],
          release() {},
        }),
        async end() {},
      },
    }),
  });
  const emailedCodes = new Map<string, string>();
  const createTestAuth = () =>
    betterAuth({
      baseURL: origin,
      secret,
      database: { db: kysely, type: "postgres" },
      emailAndPassword: { enabled: true },
      plugins: [
        ...createOAuthPlugins(origin),
        admin(),
        organization({ teams: { enabled: true } }),
        apiKey(),
        emailOTP({
          sendVerificationOTP: async ({ email, otp }) => {
            emailedCodes.set(email, otp);
          },
        }),
        ...createTwoFactorPlugins(),
      ],
      advanced: { database: { generateId: () => crypto.randomUUID() } },
    });
  let auth: ReturnType<typeof createTestAuth>;

  async function request(path: string, body?: Record<string, unknown>, cookie?: string) {
    return auth.handler(
      new Request(`${origin}/api/auth${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          origin,
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    );
  }

  async function sessionUser(cookie: string) {
    const response = await request("/get-session", undefined, cookie);
    return ((await response.json()) as { user?: { email: string; twoFactorEnabled?: boolean } } | null)?.user;
  }

  async function userWithTwoFactor(email: string) {
    const signup = await request("/sign-up/email", { name: email, email, password });
    expect(signup.status, await signup.clone().text()).toBe(200);
    const cookie = cookieJar(signup);
    const enable = await request("/two-factor/enable", { password }, cookie);
    expect(enable.status, await enable.clone().text()).toBe(200);
    const { totpURI, backupCodes } = (await enable.json()) as { totpURI: string; backupCodes: string[] };
    expect((await sessionUser(cookie))?.twoFactorEnabled).toBe(false);
    const confirm = await request("/two-factor/verify-totp", { code: totpCode(totpURI) }, cookie);
    expect(confirm.status, await confirm.clone().text()).toBe(200);
    expect((await sessionUser(cookieJar(signup, confirm)))?.twoFactorEnabled).toBe(true);
    return { totpURI, backupCodes };
  }

  async function signIn(email: string, extra: Record<string, unknown> = {}, cookie?: string) {
    const response = await request("/sign-in/email", { email, password, ...extra }, cookie);
    expect(response.status, await response.clone().text()).toBe(200);
    return { response, body: (await response.json()) as Record<string, unknown>, cookie: cookieJar(response) };
  }

  beforeAll(async () => {
    const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrationDirectory), "utf8"));
    for (const entry of journal.entries) {
      await database.exec(await readFile(new URL(`${entry.tag}.sql`, migrationDirectory), "utf8"));
    }
    auth = createTestAuth();
    await auth.$context;
  }, 60_000);

  afterAll(async () => {
    await kysely.destroy();
    await database.close();
  });

  it("can rerun the migration", async () => {
    await database.exec(await readFile(new URL("0025_two_factor.sql", migrationDirectory), "utf8"));
    const { rows } = await database.query<{ twoFactorEnabled: boolean | null }>(
      `SELECT "twoFactorEnabled" FROM "user" LIMIT 1`
    );
    expect(rows).toEqual([]);
  });

  it("signs in with a password alone while two-factor is off", async () => {
    await request("/sign-up/email", { name: "Plain", email: "plain@example.com", password });
    const { body, cookie } = await signIn("plain@example.com");
    expect(body.twoFactorRedirect).toBeUndefined();
    expect((await sessionUser(cookie))?.email).toBe("plain@example.com");
  });

  it("refuses to turn two-factor on without the password, or with email codes", async () => {
    const signup = await request("/sign-up/email", { name: "Wrong", email: "wrong@example.com", password });
    const cookie = cookieJar(signup);
    expect((await request("/two-factor/enable", { password: "not-the-password" }, cookie)).status).toBe(400);
    const otp = await request("/two-factor/enable", { password, method: "otp" }, cookie);
    expect(otp.status).toBe(400);
    expect(await otp.json()).toMatchObject({ code: "OTP_NOT_CONFIGURED" });
    expect((await sessionUser(cookie))?.twoFactorEnabled).toBe(false);
  });

  it("asks for an authenticator code after the password, and only then creates a session", async () => {
    const { totpURI } = await userWithTwoFactor("totp@example.com");
    const { body, cookie } = await signIn("totp@example.com");
    expect(body).toMatchObject({ twoFactorRedirect: true });
    expect(cookie).not.toContain("session_token");
    expect(await sessionUser(cookie)).toBeUndefined();

    expect((await request("/two-factor/verify-totp", { code: "000000" }, cookie)).status).toBe(401);
    const verify = await request("/two-factor/verify-totp", { code: totpCode(totpURI) }, cookie);
    expect(verify.status, await verify.clone().text()).toBe(200);
    expect((await sessionUser(cookieJar(verify)))?.email).toBe("totp@example.com");
  });

  it("accepts each backup code once", async () => {
    const { backupCodes } = await userWithTwoFactor("backup@example.com");
    expect(backupCodes).toHaveLength(10);

    const first = await signIn("backup@example.com");
    const verify = await request("/two-factor/verify-backup-code", { code: backupCodes[0] }, first.cookie);
    expect(verify.status, await verify.clone().text()).toBe(200);
    expect((await sessionUser(cookieJar(verify)))?.email).toBe("backup@example.com");

    const second = await signIn("backup@example.com");
    expect((await request("/two-factor/verify-backup-code", { code: backupCodes[0] }, second.cookie)).status).toBe(401);
  });

  it("skips the code on a device the user chose to trust", async () => {
    const { totpURI } = await userWithTwoFactor("trusted@example.com");
    const first = await signIn("trusted@example.com");
    const verify = await request(
      "/two-factor/verify-totp",
      { code: totpCode(totpURI), trustDevice: true },
      first.cookie
    );
    expect(verify.status, await verify.clone().text()).toBe(200);
    const trustCookie = cookieJar(verify)
      .split("; ")
      .filter(pair => pair.includes("trust_device"))
      .join("; ");
    expect(trustCookie).not.toBe("");

    const again = await signIn("trusted@example.com", {}, trustCookie);
    expect(again.body.twoFactorRedirect).toBeUndefined();
    expect((await sessionUser(again.cookie))?.email).toBe("trusted@example.com");
  });

  it("revokes every trusted device when two-factor is turned off", async () => {
    const email = "devices@example.com";
    const { totpURI } = await userWithTwoFactor(email);
    const trustDevice = async () => {
      const { cookie } = await signIn(email);
      const verify = await request("/two-factor/verify-totp", { code: totpCode(totpURI), trustDevice: true }, cookie);
      expect(verify.status, await verify.clone().text()).toBe(200);
      return cookieJar(verify);
    };
    const laptop = await trustDevice();
    await trustDevice();
    const trustedDevices = async () =>
      (
        await database.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM verification
           WHERE identifier LIKE 'trust-device-%' AND value = (SELECT id FROM "user" WHERE email = $1)`,
          [email]
        )
      ).rows[0].count;
    expect(await trustedDevices()).toBe(2);

    expect((await request("/two-factor/disable", { password: "not-the-password" }, laptop)).status).toBe(400);
    expect(await trustedDevices()).toBe(2);

    const disable = await request("/two-factor/disable", { password }, laptop);
    expect(disable.status, await disable.clone().text()).toBe(200);
    expect(await trustedDevices()).toBe(0);
  });

  it("refuses email-code sign-in for accounts with two-factor on", async () => {
    await userWithTwoFactor("emailcode@example.com");
    await request("/email-otp/send-verification-otp", { email: "emailcode@example.com", type: "sign-in" });
    const code = emailedCodes.get("emailcode@example.com")!;
    const response = await request("/sign-in/email-otp", { email: "emailcode@example.com", otp: code });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_OTP" });
    expect(cookieJar(response)).not.toContain("session_token");

    await request("/email-otp/send-verification-otp", { email: "plain@example.com", type: "sign-in" });
    const plain = await request("/sign-in/email-otp", {
      email: "plain@example.com",
      otp: emailedCodes.get("plain@example.com"),
    });
    expect(plain.status, await plain.clone().text()).toBe(200);
  });

  it("resumes an MCP OAuth authorization after the code step", async () => {
    const { totpURI } = await userWithTwoFactor("oauth@example.com");
    const registration = await request("/oauth2/register", {
      client_name: "Two-factor client",
      redirect_uris: ["http://localhost:9876/callback"],
      application_type: "native",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
    expect(registration.status, await registration.clone().text()).toBe(201);
    const client = (await registration.json()) as { client_id: string };
    const query = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: "http://localhost:9876/callback",
      response_type: "code",
      scope: "openid analytics:read",
      resource: `${origin}/api/mcp`,
      code_challenge: createHash("sha256").update("v".repeat(64)).digest("base64url"),
      code_challenge_method: "S256",
      state: "two-factor-state",
    });
    const authorize = await request(`/oauth2/authorize?${query}`);
    const loginUrl = new URL(((await authorize.json()) as { url: string }).url);
    expect(loginUrl.pathname).toBe("/login");
    const oauthQuery = loginUrl.search.slice(1);

    const first = await signIn("oauth@example.com", { oauth_query: oauthQuery });
    expect(first.body).toMatchObject({ twoFactorRedirect: true });
    const verify = await request(
      "/two-factor/verify-totp",
      { code: totpCode(totpURI), oauth_query: oauthQuery },
      first.cookie
    );
    expect(verify.status, await verify.clone().text()).toBe(200);
    const next = new URL(((await verify.json()) as { url: string }).url);
    expect(next.pathname).toBe("/auth/consent");
  });
});
