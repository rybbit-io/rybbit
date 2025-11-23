"use client";

import { Button } from "@/components/ui/button";
import { SiGoogle, SiGithub } from "@icons-pack/react-simple-icons";
import { authClient } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/const";

interface SocialButtonsProps {
  onError: (error: string) => void;
  callbackURL?: string;
  mode?: "signin" | "signup";
  className?: string;
}

export function SocialButtons({ onError, callbackURL, mode = "signin", className = "" }: SocialButtonsProps) {
  if (!IS_CLOUD) return null;

  const handleSocialAuth = async (provider: "google" | "github" | "twitter") => {
    try {
      await authClient.signIn.social({
        provider,
        ...(callbackURL && mode !== "signup" ? { callbackURL } : {}),
        // For signup flow, new users should be redirected to the same callbackURL
        ...(mode === "signup" && callbackURL ? { newUserCallbackURL: callbackURL } : {}),
      });
    } catch (error) {
      onError(String(error));
    }
  };

  return (
    <>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="text-muted-foreground">Or continue with</span>
      </div>

      <div className={`flex flex-col gap-2 ${className}`}>
        <Button type="button" onClick={() => handleSocialAuth("google")}>
          <SiGoogle />
          Google
        </Button>
        <Button type="button" onClick={() => handleSocialAuth("github")}>
          <SiGithub />
          GitHub
        </Button>
      </div>
    </>
  );
}
