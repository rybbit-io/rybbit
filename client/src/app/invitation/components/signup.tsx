"use client";

import { useState } from "react";
import { authClient } from "../../../lib/auth";
import { userStore } from "../../../lib/userStore";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { SocialButtons } from "@/components/auth/SocialButtons";

interface SignupProps {
  inviterEmail?: string | null;
  organization?: string | null;
}

export function Signup({ inviterEmail, organization }: SignupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await authClient.signUp.email({
        email,
        name: email.split("@")[0], // Use email prefix as default name
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
        setError(error.message || "An error occurred during signup");
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <div className="flex flex-col gap-4">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="email@example.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <AuthInput
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <AuthButton isLoading={isLoading} loadingText="Creating account...">
          Sign Up to Accept Invitation
        </AuthButton>

        <SocialButtons onError={setError} />

        <AuthError error={error} />
      </div>
    </form>
  );
}
