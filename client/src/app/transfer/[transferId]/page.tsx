"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import type { IncomingSiteTransfer } from "@/api/admin/endpoints/siteTransfers";
import { USER_ORGANIZATIONS_QUERY_KEY, useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import {
  useAcceptSiteTransfer,
  useDeclineSiteTransfer,
  useIncomingSiteTransfer,
} from "@/api/admin/hooks/useSiteTransfers";
import { ApiError } from "@/api/utils";
import { Login } from "@/app/invitation/components/login";
import { Signup } from "@/app/invitation/components/signup";
import { Favicon } from "@/components/Favicon";
import { ThreeDotLoader } from "@/components/Loaders";
import { RybbitLogo } from "@/components/RybbitLogo";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth";
import { getTimezone } from "@/lib/store";

// The recipient's side of a site transfer (see server/src/api/sites/siteTransfers.ts):
// the emailed link lands here, and the recipient, signed in with the address it
// was sent to, moves the site into an organization they manage.

function slugFromName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

function PageCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-md p-1">
      <CardHeader>
        <RybbitLogo width={32} height={32} />
        <CardTitle className="text-2xl flex justify-center text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SignInToAccept({ transferId }: { transferId: string }) {
  const t = useExtracted();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");
  // Brings OAuth sign-ins back here.
  const callbackURL = `/transfer/${encodeURIComponent(transferId)}`;

  return (
    <PageCard title={t("Accept a site transfer")}>
      <p className="text-center text-sm text-muted-foreground -mt-2 mb-6">
        {t("Sign in with the email address the transfer was sent to.")}
      </p>
      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as "login" | "signup")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="signup">{t("Sign Up")}</TabsTrigger>
          <TabsTrigger value="login">{t("Login")}</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Login callbackURL={callbackURL} />
        </TabsContent>
        <TabsContent value="signup">
          <Signup callbackURL={callbackURL} />
        </TabsContent>
      </Tabs>
    </PageCard>
  );
}

function WrongAccount({ recipientEmail, currentEmail }: { recipientEmail: string; currentEmail: string }) {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    queryClient.clear();
    await authClient.signOut();
    // Back to this page signed out, where the sign-in form returns here.
    window.location.reload();
  };

  return (
    <PageCard title={t("Accept a site transfer")}>
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm">
          {t("This transfer was sent to {recipientEmail}. Sign in with that address.", { recipientEmail })}
        </p>
        <p className="text-xs text-muted-foreground">{t("Signed in as {email}", { email: currentEmail })}</p>
        <Button onClick={signOut} loading={isSigningOut} loadingLabel={t("Signing out...")} className="w-full">
          {t("Sign out")}
        </Button>
      </div>
    </PageCard>
  );
}

function VerifyEmail({ transferId, email }: { transferId: string; email: string }) {
  const t = useExtracted();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async () => {
    setStatus("sending");
    // Opening the emailed link verifies the address and brings them back here.
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/transfer/${encodeURIComponent(transferId)}`,
    });
    setStatus(error ? "error" : "sent");
  };

  return (
    <PageCard title={t("Verify your email to accept this transfer")}>
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm">{t("We'll send a link to {email}. Open it, then come back to this page.", { email })}</p>
        {status === "sent" ? (
          <p className="text-sm text-muted-foreground">{t("Verification email sent. Check your inbox.")}</p>
        ) : (
          <Button onClick={send} loading={status === "sending"} className="w-full">
            {t("Send verification email")}
          </Button>
        )}
        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("Couldn't send the email. Try again in a moment.")}</AlertDescription>
          </Alert>
        )}
      </div>
    </PageCard>
  );
}

function InvalidLink() {
  const t = useExtracted();
  const router = useRouter();

  return (
    <PageCard title={t("This link is no longer valid")}>
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("The transfer may have expired, been cancelled, or already been accepted.")}
        </p>
        <Button variant="outline" onClick={() => router.push("/")} className="w-full">
          {t("Go to dashboard")}
        </Button>
      </div>
    </PageCard>
  );
}

function AcceptTransfer({ transfer }: { transfer: IncomingSiteTransfer }) {
  const t = useExtracted();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: organizations, isLoading: isLoadingOrganizations } = useUserOrganizations();
  const acceptTransfer = useAcceptSiteTransfer(transfer.id);
  const declineTransfer = useDeclineSiteTransfer(transfer.id);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  // Stays set once accepted, while we navigate to the site.
  const [isAccepting, setIsAccepting] = useState(false);
  const [confirmDeclineOpen, setConfirmDeclineOpen] = useState(false);
  const [error, setError] = useState("");

  // Organizations the recipient may add sites to, other than the one it's leaving.
  const targets = (organizations ?? []).filter(
    org => org.permissions.includes("sites:create") && org.id !== transfer.sourceOrganizationId
  );
  const targetId = selectedOrganizationId || targets[0]?.id;
  const { domain } = transfer.site;
  const expires = DateTime.fromISO(transfer.expiresAt).setZone(getTimezone()).toLocaleString(DateTime.DATE_MED);

  const handleAccept = async () => {
    setError("");
    setIsAccepting(true);
    try {
      let organizationId = targetId;
      if (!organizationId) {
        const name = organizationName.trim();
        const { data, error: createError } = await authClient.organization.create({ name, slug: slugFromName(name) });
        if (createError) {
          throw new Error(createError.message || t("Failed to create organization"));
        }
        if (!data?.id) {
          throw new Error(t("No organization ID returned"));
        }
        organizationId = data.id;
        // If accepting fails from here, the new organization shows up as the target to retry with.
        void queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
      }

      const result = await acceptTransfer.mutateAsync(organizationId);
      await authClient.organization.setActive({ organizationId: result.organizationId });
      router.push(`/${result.siteId}`);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : String(acceptError));
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    setError("");
    declineTransfer.mutate(undefined, {
      onSuccess: () => router.push("/"),
      onError: declineError => {
        setConfirmDeclineOpen(false);
        setError(declineError.message || t("Failed to decline the transfer"));
      },
    });
  };

  return (
    <PageCard title={t("Accept {domain}", { domain })}>
      <div className="flex flex-col gap-5">
        <p className="text-center text-sm text-muted-foreground -mt-2">
          {transfer.sentBy
            ? t("{sender} is transferring this site to you from {organization}.", {
                sender: transfer.sentBy,
                organization: transfer.sourceOrganizationName,
              })
            : t("{organization} is transferring this site to you.", {
                organization: transfer.sourceOrganizationName,
              })}
        </p>

        <div className="flex items-center gap-3 rounded-lg border border-neutral-150 px-4 py-3 dark:border-neutral-800">
          <Favicon domain={domain} className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{transfer.site.name || domain}</div>
            {transfer.site.name && transfer.site.name !== domain && (
              <div className="truncate text-xs text-muted-foreground">{domain}</div>
            )}
          </div>
        </div>

        {isLoadingOrganizations ? (
          <ThreeDotLoader className="py-4" />
        ) : targets.length > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor="transfer-organization">{t("Move it into")}</Label>
            <Select value={targetId} onValueChange={setSelectedOrganizationId}>
              <SelectTrigger id="transfer-organization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("The site moves there with all its data.")}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="transfer-new-organization">{t("Create an organization")}</Label>
            <Input
              id="transfer-new-organization"
              placeholder={t("Organization name")}
              value={organizationName}
              onChange={event => setOrganizationName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("You don't manage an organization yet. The site moves into this new one.")}
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="success"
            className="w-full"
            onClick={handleAccept}
            loading={isAccepting}
            loadingLabel={t("Accepting...")}
            disabled={isLoadingOrganizations || (!targetId && !organizationName.trim()) || declineTransfer.isPending}
          >
            {t("Accept transfer")}
          </Button>
          <AlertDialog
            open={confirmDeclineOpen}
            onOpenChange={next => {
              if (!declineTransfer.isPending) setConfirmDeclineOpen(next);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full" disabled={isAccepting || declineTransfer.isPending}>
                {t("Decline")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Decline this transfer?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("{domain} stays with {organization}, and this link stops working.", {
                    domain,
                    organization: transfer.sourceOrganizationName,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={declineTransfer.isPending}>{t("Cancel")}</AlertDialogCancel>
                {/* A plain Button, so the dialog stays open while the request runs. */}
                <Button variant="destructive" onClick={handleDecline} loading={declineTransfer.isPending}>
                  {t("Decline transfer")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-center text-xs text-muted-foreground">{t("This link expires {date}.", { date: expires })}</p>
      </div>
    </PageCard>
  );
}

function IncomingTransfer({ transferId, currentEmail }: { transferId: string; currentEmail: string }) {
  const t = useExtracted();
  const { data: transfer, error, isLoading } = useIncomingSiteTransfer(transferId);

  if (isLoading) {
    return <ThreeDotLoader />;
  }
  if (error instanceof ApiError && error.status === 403) {
    const body = error.body as { reason?: string; recipientEmailHint?: string } | undefined;
    if (body?.reason === "email_unverified") {
      return <VerifyEmail transferId={transferId} email={currentEmail} />;
    }
    // The server only reveals a masked address, e.g. "t••@example.org".
    return <WrongAccount recipientEmail={body?.recipientEmailHint ?? ""} currentEmail={currentEmail} />;
  }
  if (error instanceof ApiError && error.status === 404) {
    return <InvalidLink />;
  }
  if (error || !transfer) {
    return (
      <PageCard title={t("Accept a site transfer")}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error?.message || t("Failed to load the transfer")}</AlertDescription>
        </Alert>
      </PageCard>
    );
  }
  return <AcceptTransfer transfer={transfer} />;
}

export default function SiteTransferPage() {
  const { transferId } = useParams<{ transferId: string }>();
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex justify-center items-center grow p-4">
        {isPending ? (
          <ThreeDotLoader />
        ) : !session?.user ? (
          <SignInToAccept transferId={transferId} />
        ) : (
          <IncomingTransfer transferId={transferId} currentEmail={session.user.email} />
        )}
      </div>
    </div>
  );
}
