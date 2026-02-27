"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { authClient } from "../../../lib/auth";
import { userStore } from "../../../lib/userStore";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { SocialButtons } from "@/components/auth/SocialButtons";

interface LoginProps {
  callbackURL: string;
}

export function Login({ callbackURL }: LoginProps) {
  const t = useExtracted();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
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
        // Force reload to show the AcceptInvitationInner component
        window.location.reload();
      }

      if (error) {
        setError(error.message || t("An error occurred during login"));
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="flex flex-col gap-4">
        <SocialButtons onError={setError} callbackURL={callbackURL} />
        <AuthInput
          id="email"
          label={t("Email")}
          type="email"
          placeholder="example@email.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <AuthInput
          id="password"
          label={t("Password")}
          type="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <AuthButton isLoading={isLoading} loadingText={t("Logging in...")}>
          {t("Login to Accept Invitation")}
        </AuthButton>
        <AuthError error={error} />
      </div>
    </form>
  );
}
