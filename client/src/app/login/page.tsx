"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import { AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { DISABLE_SIGNUP, IS_CLOUD } from "../../lib/const";
import { userStore } from "../../lib/userStore";

export default function Page() {
  useSetPageTitle("Rybbit · Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setError("");
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (data?.user) {
        userStore.setState({
          user: data.user,
        });
        router.push("/");
      }

      if (error) {
        setError(error.message);
      }
    } catch (error) {
      setError(String(error));
    }
    setIsLoading(false);
  };

  const handleSocialSignIn = async (
    provider: "google" | "github" | "twitter"
  ) => {
    try {
      await authClient.signIn.social({
        provider,
      });
    } catch (error) {
      setError(String(error));
    }
  };

  return (
    <div className="flex justify-center items-center h-screen w-full">
      <Card className="w-full max-w-sm p-1">
        <CardHeader>
          <Image src="/rybbit.png" alt="Rybbit" width={32} height={32} />
          <CardTitle className="text-2xl flex justify-center">
            Sign in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor={"email"}>Email</Label>
                <Input
                  id={"email"}
                  type={"email"}
                  placeholder={"example@email.com"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {/* todo: add forgot password */}
                  {/* <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                variant={"success"}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              {IS_CLOUD && (
                <>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignIn("google")}
                    >
                      <GoogleLogo weight="bold" />
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignIn("github")}
                    >
                      <GithubLogo weight="bold" />
                      GitHub
                    </Button>
                  </div>
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Logging In</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {!DISABLE_SIGNUP && (
                <div className="text-center text-sm">
                  Don't have an account?{" "}
                  <Link href="/signup" className="underline">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
