"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { IS_CLOUD } from "../../lib/const";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { Turnstile } from "@/components/auth/Turnstile";

export default function ResetPasswordPage() {
  useSetPageTitle("Rybbit · Reset Password");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const router = useRouter();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate Turnstile token if in cloud mode and production
    if (IS_CLOUD && process.env.NODE_ENV === "production" && !turnstileToken) {
      setError("Please complete the captcha verification");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await authClient.emailOtp.sendVerificationOtp(
        {
          email,
          type: "forget-password",
        },
        {
          onRequest: context => {
            if (IS_CLOUD && process.env.NODE_ENV === "production" && turnstileToken) {
              context.headers.set("x-captcha-response", turnstileToken);
            }
          },
        }
      );

      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
      }
    } catch (error) {
      setError(String(error));
    }

    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simple validation for password length
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters long");
        setIsLoading(false);
        return;
      }

      const { data, error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (error) {
      setError(String(error));
    }

    setIsLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-dvh w-full p-4">
      <Card className="w-full max-w-sm p-1">
        <CardHeader>
          <Image src="/rybbit.svg" alt="Rybbit" width={32} height={32} />
          <CardTitle className="text-2xl flex justify-center">
            {resetSuccess ? "Password Reset Successful" : otpSent ? "Enter OTP Code" : "Reset Password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resetSuccess ? (
            <div className="flex flex-col items-center space-y-6 py-4">
              <div className="h-20 w-20 rounded-full bg-green-900/20 flex items-center justify-center border-2 border-green-500 text-green-500">
                <span className="text-3xl font-bold">✓</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-medium text-green-500">Success!</h3>
                <p className="text-muted-foreground">Your password has been reset successfully.</p>
              </div>
              <div className="w-full rounded-md bg-neutral-800/30 p-3 mt-4">
                <div className="flex justify-center">
                  <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
                </div>
              </div>
            </div>
          ) : otpSent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to {email}. Please enter the code below along with your new password.
              </p>

              <AuthInput
                id="otp"
                label="Verification Code"
                type="text"
                placeholder="000000"
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />

              <AuthInput
                id="new-password"
                label="New Password"
                type="password"
                placeholder="••••••••"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />

              <AuthButton isLoading={isLoading} loadingText="Resetting password...">
                Reset Password
              </AuthButton>

              <AuthError error={error} title="Error Resetting Password" />

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Use a different email
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a verification code to reset your password.
              </p>

              <AuthInput
                id="email"
                label="Email"
                type="email"
                placeholder="example@email.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              {IS_CLOUD && process.env.NODE_ENV === "production" && (
                <Turnstile
                  onSuccess={token => setTurnstileToken(token)}
                  onError={() => setTurnstileToken("")}
                  onExpire={() => setTurnstileToken("")}
                  className="flex justify-center"
                />
              )}

              <AuthButton
                isLoading={isLoading}
                loadingText="Sending code..."
                disabled={IS_CLOUD && process.env.NODE_ENV === "production" ? !turnstileToken || isLoading : isLoading}
              >
                Send Verification Code
              </AuthButton>

              <AuthError error={error} title="Error Sending Code" />

              <div className="text-center text-sm">
                Remember your password?{" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
