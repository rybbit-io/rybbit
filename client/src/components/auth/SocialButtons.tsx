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
        ...(callbackURL ? { callbackURL } : {}),
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
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialAuth("google")}
          className="transition-all duration-300 hover:bg-muted bg-neutral-800/50 border-neutral-700"
        >
          <SiGoogle />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialAuth("github")}
          className="transition-all duration-300 hover:bg-muted bg-neutral-800/50 border-neutral-700"
        >
          <SiGithub />
          GitHub
        </Button>
      </div>
    </>
  );
}
