"use client";

import { RybbitTextLogo } from "@/components/RybbitLogo";
import { AuthError } from "@/components/auth/AuthError";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { getScopeLabel } from "@/app/settings/account/components/ApiKeyScopePicker";
import { useQuery } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Consent() {
  const t = useExtracted();
  const params = useSearchParams();
  const clientId = params.get("client_id");
  const validRequest = Boolean(clientId && params.get("sig") && params.get("exp"));
  const scopes = (params.get("scope") ?? "").split(/\s+/).filter(Boolean);
  const customScopes = scopes.filter(scope => !["openid", "profile", "email", "offline_access"].includes(scope));
  let requestedClaims: string[] = [];
  try {
    requestedClaims = Object.keys(JSON.parse(params.get("claims") || "{}").userinfo || {});
  } catch {
    // Malformed or modified claims are rejected by the provider's signature
    // validation. Do not try to repair an invalid authorization request.
  }
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const client = useQuery({
    queryKey: ["oauth-consent-client", clientId],
    enabled: validRequest && Boolean(session),
    retry: false,
    queryFn: async () => {
      const result = await authClient.oauth2.publicClient({ query: { client_id: clientId! } });
      if (result.error) throw new Error(result.error.message || t("Unable to load this application."));
      return result.data;
    },
  });

  async function respond(accept: boolean) {
    setPending(true);
    setError(undefined);
    try {
      // The provider verifies the signed query and registered redirect URI.
      // Never navigate directly to redirect_uri supplied in the page URL.
      const result = await authClient.oauth2.consent({ accept });
      if (result.error) throw new Error(result.error.message || t("Unable to complete authorization."));
      if (result.data?.url) {
        window.location.assign(result.data.url);
        return;
      }
      throw new Error(t("Unable to complete authorization."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Unable to complete authorization."));
      setPending(false);
    }
  }

  if (!validRequest)
    return (
      <AuthError error={t("This authorization request is invalid. Reconnect from your application to try again.")} />
    );
  if (sessionPending) return <p role="status">{t("Loading...")}</p>;
  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{t("Sign in to connect your application")}</h1>
        <Button asChild>
          <Link href={`/login?${params.toString()}`}>{t("Login")}</Link>
        </Button>
      </div>
    );
  }
  if (client.isPending) return <p role="status">{t("Loading...")}</p>;
  if (client.error || !client.data)
    return <AuthError error={t("Unable to load this application. Reconnect from your application to try again.")} />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{t("Connect to Rybbit")}</h1>
        <p className="break-words text-neutral-600 dark:text-neutral-300">
          {t("{application} is requesting access to your Rybbit account.", {
            application: client.data.client_name || clientId!,
          })}
        </p>
        <p className="break-all text-sm text-neutral-600 dark:text-neutral-300">{session.user.email}</p>
      </div>
      <div className="space-y-3">
        <h2 className="font-medium">{t("Requested permissions")}</h2>
        {customScopes.length === 0 ? (
          <p>
            {t("Full API access, including viewing analytics and making changes allowed by your account permissions.")}
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {customScopes.map(scope => {
              const [resource, action] = scope.split(":");
              const label = getScopeLabel(resource);
              return (
                <li key={scope} className="break-words">
                  {action === "write"
                    ? t("{resource}: view and make changes", { resource: label })
                    : action === "read"
                      ? t("{resource}: view", { resource: label })
                      : scope}
                </li>
              );
            })}
          </ul>
        )}
        {scopes.some(scope => ["openid", "profile", "email"].includes(scope)) && (
          <p className="text-sm">{t("Read your account identity and profile information.")}</p>
        )}
        {scopes.includes("offline_access") && (
          <p className="text-sm">{t("Keep accessing your account when you are not using this application.")}</p>
        )}
        {requestedClaims.length > 0 && (
          <p className="break-words text-sm">
            {t("Additional profile information: {claims}", { claims: requestedClaims.join(", ") })}
          </p>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {t("Only connect applications you trust. Access is limited to the sites and organizations you can use.")}
        </p>
      </div>
      <AuthError error={error} />
      <div className="flex flex-wrap gap-3">
        <Button variant="success" disabled={pending} onClick={() => respond(true)}>
          {pending ? t("Please wait...") : t("Allow access")}
        </Button>
        <Button disabled={pending} onClick={() => respond(false)}>
          {t("Cancel")}
        </Button>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-6 py-12">
      <RybbitTextLogo />
      <Suspense>
        <Consent />
      </Suspense>
    </main>
  );
}
