"use client";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthInput } from "@/components/auth/AuthInput";
import { Turnstile } from "@/components/auth/Turnstile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { addSite } from "../../../api/admin/sites";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { authClient } from "../../../lib/auth";
import { IS_CLOUD } from "../../../lib/const";
import { userStore } from "../../../lib/userStore";
import { cn, isValidDomain, normalizeDomain } from "../../../lib/utils";
import { RybbitTextLogo } from "../../../components/RybbitLogo";

// Animation variants for step transitions
const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// Client component to handle AppSumo code from URL params
function AppSumoCodeHandler({
  onSetCode,
  onSetStep,
}: {
  onSetCode: (code: string) => void;
  onSetStep: (step: number) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      onSetCode(code);
    }

    // Handle step override for testing
    const step = searchParams.get("step");
    if (step && !isNaN(Number(step))) {
      onSetStep(Number(step));
    }
  }, [searchParams, onSetCode, onSetStep]);

  return null;
}

export default function AppSumoSignupPage() {
  useSetPageTitle("Rybbit · AppSumo Signup");

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [appsumoCode, setAppsumoCode] = useState<string>("");
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

  // Step 2: Organization creation and AppSumo license activation
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

      // Activate AppSumo license if code is present
      if (appsumoCode) {
        try {
          const response = await fetch("/api/as/activate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              code: appsumoCode,
              organizationId: data.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to activate AppSumo license");
          }

          const licenseData = await response.json();
          console.log("AppSumo license activated:", licenseData);
        } catch (licenseError) {
          console.error("Error activating AppSumo license:", licenseError);
          setError(
            "Organization created, but license activation failed. Please contact support with your license key."
          );
          // Continue to next step even if license activation fails
        }
      }

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
        router.push(`/${response.siteId}`);
      } catch (error) {
        setError(String(error));
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Skip website step and go to dashboard
  const handleSkipWebsite = () => {
    router.push("/");
  };

  // Render the content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div initial="hidden" animate="visible" variants={contentVariants}>
            <h2 className="text-2xl font-semibold mb-2">Welcome to Rybbit!</h2>
            <p className="text-sm text-muted-foreground mb-6">Activate your AppSumo license by creating an account</p>
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
            <h2 className="text-2xl font-semibold mb-2">Create your organization</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your AppSumo license will be activated for this organization
            </p>
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
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div>

              <Button
                className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={handleOrganizationSubmit}
                disabled={isLoading || !orgName || !orgSlug}
                variant="success"
              >
                Continue & Activate License
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial="hidden" animate="visible" variants={contentVariants}>
            <h2 className="text-2xl font-semibold mb-2">Add your site (optional)</h2>
            <p className="text-sm text-muted-foreground mb-6">You can always add sites later from your dashboard</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com or sub.example.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value.toLowerCase())}
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
                <p className="text-xs text-muted-foreground">Enter the domain of the website you want to track</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleWebsiteSubmit}
                  disabled={isLoading || !domain || !isValidDomain(domain)}
                  variant="success"
                >
                  Add Site & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  className="w-full transition-all duration-300 h-11"
                  onClick={handleSkipWebsite}
                  disabled={isLoading}
                  variant="outline"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-center h-dvh w-full p-4 ">
      <div className="flex flex-col items-center bg-background relative">
        {/* Suspense boundary for the URL parameter handler */}
        <Suspense fallback={null}>
          <AppSumoCodeHandler onSetCode={setAppsumoCode} onSetStep={setCurrentStep} />
        </Suspense>

        {/* Background gradients similar to docs page */}
        <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-40"></div>
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-30"></div>

        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-30"></div>
        <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-30"></div>

        <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-20"></div>

        {/* Logo and title above the card */}
        <div className="relative z-10 mb-6 text-center">
          <a href="https://rybbit.com" target="_blank" className="inline-block mb-2">
            <RybbitTextLogo />
          </a>
          <h1 className="text-lg text-neutral-300">AppSumo License Activation</h1>
        </div>

        <Card className="w-full md:w-[500px] p-0 overflow-hidden shadow-2xl border-neutral-700/50 backdrop-blur-sm bg-neutral-800/20 z-10 p-8">
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
      </div>
    </div>
  );
}
