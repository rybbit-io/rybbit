import { PGlite } from "@electric-sql/pglite";
import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { Kysely, PostgresDialect, type PostgresPoolClient } from "kysely";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOAuthPlugins, getAuthBaseUrl } from "./oauth.js";
import { teamMembershipKey } from "./teamMembership.js";

const origin = "http://localhost:3002";
const resource = `${origin}/api/mcp`;
const secret = "test-only-auth-173-secret-at-least-32-characters";
const existingApiKey = "existing-api-key-at-least-32-characters";
const migrationDirectory = new URL("../../drizzle/", import.meta.url);

describe("Better Auth 1.7 migration and OAuth integration", () => {
  const database = new PGlite();
  // Exercise the production Kysely PostgreSQL adapter using a disposable
  // PostgreSQL engine. No application DB, network or live credentials.
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
  let otp = "";
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
          sendVerificationOTP: async data => {
            otp = data.otp;
          },
        }),
      ],
      advanced: { database: { generateId: () => crypto.randomUUID() } },
    });

  let auth: ReturnType<typeof createTestAuth>;

  async function request(path: string, body?: Record<string, unknown>, cookie?: string) {
    const form = path === "/oauth2/token" || path === "/oauth2/revoke";
    return auth.handler(
      new Request(`${origin}/api/auth${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          origin,
          accept: "application/json",
          ...(body ? { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
        },
        ...(body
          ? { body: form ? new URLSearchParams(body as Record<string, string>).toString() : JSON.stringify(body) }
          : {}),
      })
    );
  }

  beforeAll(async () => {
    const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrationDirectory), "utf8"));
    for (const entry of journal.entries.filter((entry: { idx: number }) => entry.idx < 18)) {
      await database.exec(await readFile(new URL(`${entry.tag}.sql`, migrationDirectory), "utf8"));
    }
    await database.exec(`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES ('existing-user', 'Existing', 'existing@example.com', true, now(), now());
      INSERT INTO organization (id, name, slug, "createdAt") VALUES ('existing-org', 'Existing org', 'existing', now());
      INSERT INTO team (id, name, "organizationId", "createdAt") VALUES ('existing-team', 'Existing team', 'existing-org', now());
      INSERT INTO "teamMember" (id, "teamId", "userId", "createdAt") VALUES ('existing-member', 'existing-team', 'existing-user', now());
      INSERT INTO "oauthApplication" (id, name, "clientId", "clientSecret", "redirectUrls", type, "createdAt", "updatedAt") VALUES
        ('public-row', 'Existing public client', 'existing-public', '', 'http://localhost:9876/callback', 'public', now(), now()),
        ('confidential-row', 'Existing confidential client', 'existing-confidential', 'old-client-secret', 'https://client.example/callback', 'web', now(), now());
      INSERT INTO "oauthAccessToken" (id, "accessToken", "accessTokenExpiresAt", "clientId", "userId", scopes, "createdAt", "updatedAt")
        VALUES ('old-token-row', 'old-token', now() + interval '1 day', 'existing-public', 'existing-user', 'openid', now(), now());
      INSERT INTO session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
        VALUES ('existing-session', 'existing-session-token', 'existing-user', now() + interval '1 day', now(), now());
    `);
    await database.query(
      `INSERT INTO apikey (id, key, "referenceId", "createdAt", "updatedAt")
      VALUES ('existing-api-key', $1, 'existing-user', now(), now())`,
      [createHash("sha256").update(existingApiKey).digest("base64url")]
    );
    await database.exec(await readFile(new URL("0018_better_auth_173.sql", migrationDirectory), "utf8"));
    auth = createTestAuth();
    await auth.$context;
  }, 30_000);

  afterAll(async () => {
    await kysely.destroy();
    await database.close();
  });

  it("keeps pre-migration session cookies and API keys usable", async () => {
    const token = "existing-session-token";
    const signed = `${token}.${createHmac("sha256", secret).update(token).digest("base64")}`;
    const session = await request("/get-session", undefined, `better-auth.session_token=${encodeURIComponent(signed)}`);
    expect(session.status).toBe(200);
    expect(await session.json()).toMatchObject({ user: { id: "existing-user" } });
    expect(await auth.api.verifyApiKey({ body: { key: existingApiKey } })).toMatchObject({
      valid: true,
      key: { referenceId: "existing-user" },
    });
  });

  it("preserves clients, hashes confidential secrets, backfills team counts and retains legacy records", async () => {
    const { rows } = await database.query<{
      clientId: string;
      clientSecret: string | null;
      tokenEndpointAuthMethod: string;
    }>(`SELECT * FROM "oauthClient" ORDER BY "clientId"`);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clientId: "existing-public", clientSecret: null, tokenEndpointAuthMethod: "none" }),
        expect.objectContaining({
          clientId: "existing-confidential",
          clientSecret: createHash("sha256").update("old-client-secret").digest("base64url"),
          tokenEndpointAuthMethod: "client_secret_basic",
        }),
      ])
    );
    expect((await database.query(`SELECT "memberCount" FROM team WHERE id = 'existing-team'`)).rows).toEqual([
      { memberCount: 1 },
    ]);
    expect((await database.query(`SELECT id FROM "oauthAccessToken"`)).rows).toEqual([{ id: "old-token-row" }]);
    await expect(auth.api.verifyRybbitOAuthToken({ body: { token: "old-token" } })).rejects.toThrow();
  });

  it("serves current discovery and never exposes the server-only token verifier", async () => {
    const metadata = await auth.api.getOAuthServerConfig();
    expect(metadata.authorization_endpoint).toBe(`${origin}/api/auth/oauth2/authorize`);
    expect(metadata.registration_endpoint).toBe(`${origin}/api/auth/oauth2/register`);
    const response = await auth.handler(new Request(`${origin}/.well-known/oauth-protected-resource`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource,
      scopes_supported: expect.arrayContaining(["analytics:read"]),
    });
    expect((await request("/rybbit/verify-oauth", { token: "old-token" })).status).toBe(404);
  });

  it("rejects expired, wrong-audience and proof-bound tokens, and disabled clients", async () => {
    const payload = {
      sub: "existing-user",
      azp: "existing-public",
      scope: "analytics:read",
      iss: `${origin}/api/auth`,
      aud: resource,
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const sign = async (overrides: Record<string, unknown> = {}) =>
      (await auth.api.signJWT({ body: { payload: { ...payload, ...overrides } } })).token;
    const valid = await sign();
    expect(await auth.api.verifyRybbitOAuthToken({ body: { token: valid } })).toMatchObject({
      userId: "existing-user",
    });
    for (const overrides of [{ exp: 1 }, { aud: "https://other.example/api" }, { iss: "https://other.example" }]) {
      await expect(auth.api.verifyRybbitOAuthToken({ body: { token: await sign(overrides) } })).rejects.toThrow();
    }
    expect(
      await auth.api.verifyRybbitOAuthToken({ body: { token: await sign({ cnf: { jkt: "proof-required" } }) } })
    ).toBeNull();
    await database.exec(`UPDATE "oauthClient" SET disabled = true WHERE "clientId" = 'existing-public'`);
    await expect(auth.api.verifyRybbitOAuthToken({ body: { token: valid } })).rejects.toThrow();
    await database.exec(`UPDATE "oauthClient" SET disabled = false WHERE "clientId" = 'existing-public'`);
  });

  it("completes DCR, login, consent, PKCE, refresh and bearer verification", async () => {
    const registration = await request("/oauth2/register", {
      client_name: "Migration integration client",
      redirect_uris: ["http://localhost:9876/callback"],
      application_type: "native",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
    expect(registration.status, await registration.clone().text()).toBe(201);
    const client = await registration.json();
    const verifier = "v".repeat(64);
    const query = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: "http://localhost:9876/callback",
      response_type: "code",
      scope: "openid offline_access analytics:read",
      resource,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      state: "test-state",
    });
    const authorize = await request(`/oauth2/authorize?${query}`);
    const loginUrl = new URL((await authorize.json()).url);
    expect(loginUrl.pathname).toBe("/login");
    const signup = await request("/sign-up/email", {
      name: "OAuth test",
      email: "oauth@example.com",
      password: "strong-test-password-123",
      oauth_query: loginUrl.search.slice(1),
    });
    expect(signup.status, await signup.clone().text()).toBe(200);
    const signedIn = await signup.json();
    const cookie = signup.headers
      .getSetCookie()
      .map(value => value.split(";")[0])
      .join("; ");
    const consentUrl = new URL(signedIn.url);
    expect(consentUrl.pathname).toBe("/auth/consent");
    const tamperedQuery = new URLSearchParams(consentUrl.search);
    tamperedQuery.set("scope", "openid offline_access org:write");
    expect(
      (await request("/oauth2/consent", { accept: true, oauth_query: tamperedQuery.toString() }, cookie)).status
    ).toBe(400);
    const consent = await request("/oauth2/consent", { accept: true, oauth_query: consentUrl.search.slice(1) }, cookie);
    expect(consent.status, await consent.clone().text()).toBe(200);
    const callback = new URL((await consent.json()).url);
    expect(callback.searchParams.get("state")).toBe("test-state");
    const exchange = await request("/oauth2/token", {
      grant_type: "authorization_code",
      client_id: client.client_id,
      code: callback.searchParams.get("code"),
      redirect_uri: "http://localhost:9876/callback",
      code_verifier: verifier,
      resource,
    });
    expect(exchange.status, await exchange.clone().text()).toBe(200);
    const tokens = await exchange.json();
    const identity = await auth.api.verifyRybbitOAuthToken({ body: { token: tokens.access_token } });
    expect(identity).toMatchObject({ scopes: "openid offline_access analytics:read", userId: expect.any(String) });
    const refresh = await request("/oauth2/token", {
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: client.client_id,
      resource,
    });
    expect(refresh.status, await refresh.clone().text()).toBe(200);
    const renewed = await refresh.json();
    expect(await auth.api.verifyRybbitOAuthToken({ body: { token: renewed.access_token } })).toMatchObject({
      userId: identity!.userId,
    });
    const revokeAccess = await request("/oauth2/revoke", {
      token: renewed.access_token,
      token_type_hint: "access_token",
      client_id: client.client_id,
    });
    expect(revokeAccess.status, await revokeAccess.clone().text()).toBe(400);
    expect(await revokeAccess.json()).toMatchObject({ error: "unsupported_token_type" });
    const revokeRefresh = await request("/oauth2/revoke", {
      token: renewed.refresh_token,
      token_type_hint: "refresh_token",
      client_id: client.client_id,
    });
    expect(revokeRefresh.status, await revokeRefresh.clone().text()).toBe(200);
    const refreshAfterRevocation = await request("/oauth2/token", {
      grant_type: "refresh_token",
      refresh_token: renewed.refresh_token,
      client_id: client.client_id,
      resource,
    });
    expect(refreshAfterRevocation.status).toBe(400);
    // Refresh revocation cannot revoke the already-issued JWT. The linked
    // session check below still invalidates it as soon as the user signs out.
    expect(await auth.api.verifyRybbitOAuthToken({ body: { token: renewed.access_token } })).toMatchObject({
      userId: identity!.userId,
    });
    await expect(
      auth.api.verifyRybbitOAuthToken({ body: { token: tokens.access_token + "tampered" } })
    ).rejects.toThrow();
    expect((await request("/sign-out", {}, cookie)).status).toBe(200);
    await expect(auth.api.verifyRybbitOAuthToken({ body: { token: renewed.access_token } })).rejects.toThrow();
  });

  it("uses the same membership key as Better Auth's team API", async () => {
    const result = await request("/sign-up/email", {
      name: "Team owner",
      email: "team@example.com",
      password: "strong-test-password-123",
    });
    expect(result.status, await result.clone().text()).toBe(200);
    const user = (await result.json()).user;
    const cookie = result.headers
      .getSetCookie()
      .map(value => value.split(";")[0])
      .join("; ");
    const org = await auth.api.createOrganization({
      body: { name: "Test org", slug: "test-org" },
      headers: new Headers({ cookie }),
    });
    const { rows } = await database.query<{ teamId: string; membershipKey: string }>(
      `SELECT "teamId", "membershipKey" FROM "teamMember" WHERE "userId" = $1`,
      [user.id]
    );
    expect(org).toBeTruthy();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].membershipKey).toBe(teamMembershipKey(rows[0].teamId, user.id));
  });

  it("supports password recovery with email OTP on an unverified password account", async () => {
    await request("/sign-up/email", {
      name: "OTP user",
      email: "otp@example.com",
      password: "strong-test-password-123",
    });
    const sent = await request("/email-otp/send-verification-otp", {
      email: "otp@example.com",
      type: "forget-password",
    });
    expect(sent.status, await sent.clone().text()).toBe(200);
    const reset = await request("/email-otp/reset-password", {
      email: "otp@example.com",
      otp,
      password: "new-strong-test-password-456",
    });
    expect(reset.status, await reset.clone().text()).toBe(200);
    const login = await request("/sign-in/email", {
      email: "otp@example.com",
      password: "new-strong-test-password-456",
    });
    expect(login.status, await login.clone().text()).toBe(200);
  });

  it("rejects duplicate account identities before attempting schema changes", async () => {
    await database.exec(`INSERT INTO account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") VALUES
      ('duplicate-1', 'same', 'test', 'existing-user', now(), now()),
      ('duplicate-2', 'same', 'test', 'existing-user', now(), now());`);
    const migration = await readFile(new URL("0018_better_auth_173.sql", migrationDirectory), "utf8");
    await expect(database.exec(migration.split("--> statement-breakpoint")[0])).rejects.toThrow(
      "resolve duplicate account"
    );
    await database.exec(`DELETE FROM account WHERE "providerId" = 'test'`);
  });

  it("validates legacy metadata with PostgreSQL before attempting schema changes", async () => {
    const migration = await readFile(new URL("0018_better_auth_173.sql", migrationDirectory), "utf8");
    const preflight = migration.split("--> statement-breakpoint")[0];
    for (const metadata of ["not json", '{"broken":']) {
      await database.query(`UPDATE "oauthApplication" SET metadata = $1 WHERE id = 'public-row'`, [metadata]);
      await expect(database.exec(preflight)).rejects.toThrow(
        "resolve invalid JSON metadata for oauthApplication id public-row"
      );
    }
    for (const metadata of [null, "", '{"valid":true}', '"valid scalar"', "null"]) {
      await database.query(`UPDATE "oauthApplication" SET metadata = $1 WHERE id = 'public-row'`, [metadata]);
      await database.exec(preflight);
    }
  });
});

it("keeps authentication available for non-TLS LAN self-hosting", () => {
  expect(getAuthBaseUrl({ BASE_URL: " https://rybbit.example/ " })).toBe("https://rybbit.example");
  expect(createOAuthPlugins("http://192.168.1.10").map(plugin => plugin.id)).toEqual(["rybbit-oauth"]);
});
