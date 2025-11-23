"use client";

import { useState } from "react";
import { authClient } from "../../../lib/auth";
import { userStore } from "../../../lib/userStore";
import { IS_CLOUD } from "../../../lib/const";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { Turnstile } from "@/components/auth/Turnstile";

interface SignupProps {
  inviterEmail?: string | null;
  organization?: string | null;
}

export function Signup({ inviterEmail, organization }: SignupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate Turnstile token if in cloud mode
      if (IS_CLOUD && !turnstileToken) {
        setError("Please complete the captcha verification");
        setIsLoading(false);
        return;
      }

      const { data, error } = await authClient.signUp.email(
        {
          email,
          name: email.split("@")[0], // Use email prefix as default name
          password,
        },
        {
          onRequest: context => {
            if (IS_CLOUD && turnstileToken) {
              context.headers.set("x-captcha-response", turnstileToken);
            }
          },
        }
      );

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

        {IS_CLOUD && (
          <Turnstile
            onSuccess={token => setTurnstileToken(token)}
            onError={() => setTurnstileToken("")}
            onExpire={() => setTurnstileToken("")}
            className="flex justify-center"
          />
        )}

        <AuthButton
          isLoading={isLoading}
          loadingText="Creating account..."
          disabled={IS_CLOUD ? !turnstileToken || isLoading : isLoading}
        >
          Sign Up to Accept Invitation
        </AuthButton>

        <SocialButtons onError={setError} />

        <AuthError error={error} />
      </div>
    </form>
  );
}
