"use client";

import { Button } from "@/components/ui/button";
import { SiGoogle, SiGithub, SiOpenid } from "@icons-pack/react-simple-icons";
import { authClient } from "@/lib/auth";
import { useConfigs } from "@/lib/configs";
import { useExtracted } from "next-intl";

interface SocialButtonsProps {
  onError: (error: string) => void;
  callbackURL?: string;
  mode?: "signin" | "signup";
  className?: string;
}

export function SocialButtons({ onError, callbackURL, mode = "signin", className = "" }: SocialButtonsProps) {
  const t = useExtracted();
  const { configs, isLoading } = useConfigs();

  if (isLoading || !configs) {
    return null;
  }

  const hasProviders = configs.enabledOIDCProviders.length > 0 || configs.enabledSocialProviders.length > 0;

  if (!hasProviders) {
    return null;
  }

  const handleOIDCAuth = async (providerId: string) => {
    try {
      await authClient.signIn.oauth2({
        providerId,
        ...(callbackURL && mode !== "signup" ? { callbackURL } : {}),
        // For signup flow, new users should be redirected to the same callbackURL
        ...(mode === "signup" && callbackURL ? { newUserCallbackURL: callbackURL } : {}),
      });
    } catch (error) {
      onError(String(error));
    }
  }

  const handleSocialAuth = async (provider: string) => {
    try {
      await authClient.signIn.social({
        provider,
        ...(callbackURL ? { callbackURL } : {}),
        // For signup flow, new users should also be redirected to the callbackURL
        ...(mode === "signup" && callbackURL ? { newUserCallbackURL: callbackURL } : {}),
      });
    } catch (error) {
      onError(String(error));
    }
  };

  return (
    <>
      <div className={`flex flex-col gap-2 ${className}`}>
        {configs?.enabledOIDCProviders.map((provider) => (
          <Button key={provider.providerId} type="button" onClick={() => handleOIDCAuth(provider.providerId)}>
            <SiOpenid />
            {provider.name}
          </Button>
        ))}

        {configs?.enabledSocialProviders.includes("google") && (
          <Button type="button" onClick={() => handleSocialAuth("google")}>
            <SiGoogle />
            Google
          </Button>
        )}

        {configs?.enabledSocialProviders.includes("github") && (
          <Button type="button" onClick={() => handleSocialAuth("github")}>
            <SiGithub />
            GitHub
          </Button>
        )}
      </div>
      <div className="relative flex items-center text-xs uppercase">
        <div className="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
        <span className="px-3 text-muted-foreground">{t("Or continue with email")}</span>
        <div className="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
      </div>
    </>
  );
}
