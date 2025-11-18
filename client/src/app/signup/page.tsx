"use client";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { Turnstile } from "@/components/auth/Turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { addSite } from "../../api/admin/sites";
import { RybbitLogo, RybbitTextLogo } from "../../components/RybbitLogo";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { useConfigs } from "../../lib/configs";
import { IS_CLOUD } from "../../lib/const";
import { userStore } from "../../lib/userStore";
import { cn, isValidDomain, normalizeDomain } from "../../lib/utils";

// Animation variants for step transitions
const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// Client component to handle step from URL params
function StepHandler({ onSetStep }: { onSetStep: (step: number) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const step = searchParams.get("step");
    if (step && !isNaN(Number(step))) {
      onSetStep(Number(step));
    }
  }, [searchParams, onSetStep]);

  return null;
}

export default function SignupPage() {
  const { configs, isLoading: isLoadingConfigs } = useConfigs();
  useSetPageTitle("Rybbit · Signup");

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  // Step 1: Account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Step 2: Organization creation
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Step 3: Website addition
  const [organizationId, setOrganizationId] = useState("");
  const [domain, setDomain] = useState("");

  // Handle organization name change and generate slug
  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    if (value) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setOrgSlug(generatedSlug);
    }
  };

  // Step 1: Account creation submission
  const handleAccountSubmit = async () => {
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
        setCurrentStep(2);
      }

      if (error) {
        setError(error.message ?? "");
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Organization creation submission
  const handleOrganizationSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Create organization
      const { data, error } = await authClient.organization.create({
        name: orgName,
        slug: orgSlug,
      });

      if (error) {
        throw new Error(error.message || "Failed to create organization");
      }

      if (!data?.id) {
        throw new Error("No organization ID returned");
      }

      // Set as active organization
      await authClient.organization.setActive({
        organizationId: data.id,
      });

      setOrganizationId(data.id);

      setCurrentStep(3);
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Website addition submission
  const handleWebsiteSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Validate domain
      if (!isValidDomain(domain)) {
        setError("Invalid domain format. Must be a valid domain like example.com or sub.example.com");
        setIsLoading(false);
        return;
      }

      try {
        const normalizedDomain = normalizeDomain(domain);
        const response = await addSite(normalizedDomain, normalizedDomain, organizationId);
        // Navigate directly to dashboard after adding website
        // router.push(`/${response.siteId}`);
        router.push("/subscribe?siteId=" + response.siteId);
      } catch (error) {
        setError(String(error));
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Render the content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div initial="hidden" animate="visible" variants={contentVariants}>
            <h2 className="text-2xl font-semibold mb-4">Signup</h2>
            <div className="space-y-4">
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
                onClick={handleAccountSubmit}
                type="button"
                className="mt-6 transition-all duration-300 h-11"
                disabled={IS_CLOUD ? !turnstileToken || isLoading : isLoading}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </AuthButton>

              {IS_CLOUD && (
                <SocialButtons
                  onError={setError}
                  callbackURL="/signup?step=2"
                  mode="signup"
                  className="grid grid-cols-2 gap-2"
                />
              )}

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-emerald-400 transition-colors duration-300"
                >
                  Log in
                </Link>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial="hidden" animate="visible" variants={contentVariants}>
            <h2 className="text-2xl font-semibold mb-4">Create your organization</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={e => handleOrgNameChange(e.target.value)}
                  required
                  className="h-10 transition-all bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                />
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="orgSlug">Organization Slug</Label>
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="acme-inc"
                  value={orgSlug}
                  onChange={(e) =>
                    setOrgSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  required
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div> */}

              <div className="flex flex-col gap-4">
                <Button
                  className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleOrganizationSubmit}
                  disabled={isLoading || !orgName || !orgSlug}
                  variant="success"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button className="w-full transition-all duration-300 h-11" onClick={() => router.push("/")}>
                  I'm joining someone else's organization
                </Button>
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial="hidden" animate="visible" variants={contentVariants}>
            <h2 className="text-2xl font-semibold mb-4">Add your site</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com or sub.example.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value.toLowerCase())}
                  required
                  className="h-10 transition-all bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                />
                <p className="text-xs text-muted-foreground">Enter the domain of the website you want to track</p>
              </div>

              <div className="flex justify-between">
                <Button
                  className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleWebsiteSubmit}
                  disabled={isLoading || !domain || !isValidDomain(domain)}
                  variant="success"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (isLoadingConfigs) {
    return null;
  }

  if (configs?.disableSignup) {
    return (
      <div className="flex justify-center items-center h-dvh w-full">
        <Card className="w-full max-w-sm p-1">
          <CardHeader>
            <RybbitLogo width={32} height={32} />
            <CardTitle className="text-2xl flex justify-center">Sign Up Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <p className="text-center">
                New account registration is currently disabled. If you have an account, you can{" "}
                <Link href="/login" className="underline">
                  sign in
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-dvh w-full p-4 ">
      <div className="flex flex-col items-center bg-background relative">
        {/* Suspense boundary for the URL parameter handler */}
        <Suspense fallback={null}>
          <StepHandler onSetStep={setCurrentStep} />
        </Suspense>

        {/* Background gradients similar to docs page */}
        {/* <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-40"></div>
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-30"></div>

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-30"></div>
        <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-30"></div>

        <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-20"></div> */}

        {/* Logo and title above the card */}
        <div className="relative z-10 mb-6 text-center">
          <a href="https://rybbit.com" target="_blank" className="inline-block mb-2">
            <RybbitTextLogo />
          </a>
          <h1 className="text-lg text-neutral-600 dark:text-neutral-300">Get started with Rybbit</h1>
        </div>

        <Card className="w-full md:w-[500px] p-0 overflow-hidden shadow-2xl border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-sm bg-white/80 dark:bg-neutral-800/20 z-10 p-8">
          {/* Horizontal step indicator */}
          <div className="flex items-center w-full mb-4">
            {[1, 2, 3].map((step, index) => (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300",
                    currentStep === step
                      ? "bg-emerald-600 text-primary-foreground"
                      : currentStep > step
                        ? "bg-emerald-600/20 text-emerald-400 border-2 border-emerald-600/40"
                        : "bg-muted-foreground/20 text-muted-foreground border-2 border-muted-foreground/40"
                  )}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                {index < 2 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 transition-all duration-300",
                      currentStep > step ? "bg-emerald-600" : "bg-muted-foreground/40"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Content area */}
          <div className="flex flex-col gap-4">
            {renderStepContent()}
            <AuthError error={error} />
          </div>
        </Card>

        {!IS_CLOUD && (
          <div className="text-xs text-muted-foreground relative z-10 mt-8">
            <a
              href="https://rybbit.com"
              target="_blank"
              rel="noopener"
              title="Rybbit - Open Source Privacy-Focused Web Analytics"
            >
              Open source web analytics powered by Rybbit
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
