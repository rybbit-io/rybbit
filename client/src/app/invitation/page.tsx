"use client";

import { AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ThreeDotLoader } from "../../components/Loaders";
import { RybbitLogo } from "../../components/RybbitLogo";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { authClient } from "../../lib/auth";
import { Login } from "./components/login";
import { Signup } from "./components/signup";

function AuthComponent() {
  const organization = useSearchParams().get("organization");
  const inviterEmail = useSearchParams().get("inviterEmail");
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");

  return (
    <Card className="w-full max-w-md p-1">
      <CardHeader>
        <RybbitLogo width={32} height={32} />
        <CardTitle className="text-2xl flex justify-center">Join {organization}</CardTitle>
        <p className="text-center text-sm text-muted-foreground mt-2">You've been invited by {inviterEmail}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" value={activeTab} onValueChange={v => setActiveTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Login inviterEmail={inviterEmail} organization={organization} />
          </TabsContent>

          <TabsContent value="signup">
            <Signup inviterEmail={inviterEmail} organization={organization} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AcceptInvitationInner() {
  const invitationId = useSearchParams().get("invitationId");
  const organization = useSearchParams().get("organization");
  const inviterEmail = useSearchParams().get("inviterEmail");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const acceptInvitation = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId: invitationId ?? "",
      });
      if (res.error) {
        setError(res.error.message ?? "");
      } else {
        router.push("/");
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <RybbitLogo width={32} height={32} />
        <CardTitle className="text-2xl flex justify-center">Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <p className="text-center">
            You have been invited to join <span className="font-bold">{organization}</span> by{" "}
            <span className="font-bold">{inviterEmail}</span>
          </p>

          <Button onClick={acceptInvitation} disabled={isLoading} variant="success" className="w-full">
            {isLoading ? "Accepting..." : "Accept Invitation"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InvitationContent() {
  const { data: sessionData, isPending } = authClient.useSession();

  return <>{isPending ? <ThreeDotLoader /> : !sessionData?.user ? <AuthComponent /> : <AcceptInvitationInner />}</>;
}

export default function AcceptInvitation() {
  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex justify-center items-center flex-grow p-4">
        <Suspense fallback={<ThreeDotLoader />}>
          <InvitationContent />
        </Suspense>
      </div>
    </div>
  );
}
