"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { userStore } from "../../lib/userStore";
import { useConfigs } from "../../lib/configs";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { SocialButtons } from "@/components/auth/SocialButtons";

export default function Page() {
  const { configs, isLoading: isLoadingConfigs } = useConfigs();
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

  return (
    <div className="flex flex-col justify-between items-center h-dvh w-full p-4">
      <div></div>
      <Card className="w-full max-w-sm p-1">
        <CardHeader>
          <Image src="/rybbit.svg" alt="Rybbit" width={32} height={32} />
          <CardTitle className="text-2xl flex justify-center">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <AuthInput
                id="email"
                label="Email"
                type="email"
                placeholder="example@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <AuthInput
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightElement={
                  <Link href="/reset-password" className="text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </Link>
                }
              />

              <AuthButton isLoading={isLoading} loadingText="Logging in...">
                Login
              </AuthButton>

              <SocialButtons onError={setError} />

              <AuthError error={error} title="Error Logging In" />

              {(!configs?.disableSignup || !isLoadingConfigs) && (
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
      <div className="text-xs text-muted-foreground">
        <a
          href="https://rybbit.io"
          target="_blank"
          rel="noopener"
          title="Rybbit - Open Source Privacy-Focused Web Analytics"
        >
          Open source web analytics powered by Rybbit
        </a>
      </div>
    </div>
  );
}
