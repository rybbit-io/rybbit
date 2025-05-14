"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AppWindow,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Code,
  Sparkles,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { addSite } from "../../api/admin/sites";
import { CodeSnippet } from "../../components/CodeSnippet";
import { Logo } from "../../components/Logo";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useSetPageTitle } from "../../hooks/useSetPageTitle";
import { authClient } from "../../lib/auth";
import { DISABLE_SIGNUP, IS_CLOUD } from "../../lib/const";
import { userStore } from "../../lib/userStore";
import { cn } from "../../lib/utils";

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
  useSetPageTitle("Rybbit · Signup");

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  // Step 1: Account creation
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Organization creation
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Step 3: Website addition
  const [organizationId, setOrganizationId] = useState("");
  const [domain, setDomain] = useState("");

  // Step 4: Data for tracking code
  const [siteId, setSiteId] = useState<number>();

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

  // Validate domain
  const isValidDomain = (domain: string): boolean => {
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  // Step 1: Account creation submission
  const handleAccountSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await authClient.signUp.email({
        email,
        name,
        password,
      });

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
        setError(
          "Invalid domain format. Must be a valid domain like example.com or sub.example.com"
        );
        setIsLoading(false);
        return;
      }

      try {
        const response = await addSite(domain, domain, organizationId);
        setSiteId(response.siteId);
        setCurrentStep(4);
      } catch (error) {
        setError(String(error));
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Get step icon based on step number
  const getStepIcon = (step: number) => {
    switch (step) {
      case 1:
        return <User className="h-4 w-4" />;
      case 2:
        return <Building2 className="h-4 w-4" />;
      case 3:
        return <AppWindow className="h-4 w-4" />;
      case 4:
        return <Sparkles className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Render the content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={contentVariants}
          >
            <h2 className="text-2xl font-semibold mb-6">Create your account</h2>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div>
              <Button
                onClick={handleAccountSubmit}
                className="w-full mt-6 transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={isLoading || !email || !password}
                variant="success"
              >
                {isLoading ? "Creating account..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {IS_CLOUD && (
                <>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        authClient.signIn.social({
                          provider: "google",
                          callbackURL: "/signup?step=2",
                        });
                      }}
                      className="transition-all duration-300 hover:bg-muted bg-neutral-800/50 border-neutral-700"
                    >
                      <GoogleLogo weight="bold" />
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        authClient.signIn.social({
                          provider: "github",
                          callbackURL: "/signup?step=2",
                        });
                      }}
                      className="transition-all duration-300 hover:bg-muted bg-neutral-800/50 border-neutral-700"
                    >
                      <GithubLogo weight="bold" />
                      GitHub
                    </Button>
                  </div>
                </>
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
          <motion.div
            initial="hidden"
            animate="visible"
            variants={contentVariants}
          >
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-500" />
              Create your organization
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
              </div>

              <div className="space-y-2">
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
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <Button
                  className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleOrganizationSubmit}
                  disabled={isLoading || !orgName || !orgSlug}
                  variant="success"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  className="w-full transition-all duration-300 h-11"
                  onClick={() => router.push("/")}
                >
                  I'm joining someone else's organization
                </Button>
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={contentVariants}
          >
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <AppWindow className="h-6 w-6 text-emerald-500" />
              Add your first website
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Website Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com or sub.example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                  className="h-10 transition-all bg-neutral-800/50 border-neutral-700"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the domain of the website you want to track
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  className="w-full transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleWebsiteSubmit}
                  disabled={isLoading || !domain}
                  variant="success"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={contentVariants}
          >
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Code className="h-6 w-6 text-emerald-500" />
              Add tracking code to your website
            </h2>
            <div className="space-y-6">
              <div className="rounded-lg bg-muted p-5 border border-neutral-700 backdrop-blur-sm bg-neutral-800/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-base font-medium">
                    Your account is ready!
                  </p>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  To start collecting analytics data, add this tracking code to
                  your website.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>
                  Place this snippet in the &lt;head&gt; of your website
                </Label>
                <div className="border border-neutral-700 rounded-lg overflow-hidden">
                  <CodeSnippet
                    language="HTML"
                    code={`<script\n    src="${globalThis.location.origin}/api/script.js"\n    data-site-id="${siteId}"\n    defer\n></script>`}
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 border border-neutral-700 backdrop-blur-sm bg-neutral-800/20">
                <p className="text-sm text-muted-foreground">
                  Once you've added the tracking code, it may take a few minutes
                  for data to appear in your dashboard.
                </p>
              </div>

              <div className="flex justify-between pt-4 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="transition-all duration-300 h-11 bg-neutral-800/50 border-neutral-700"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => router.push(`/${siteId}`)}
                  variant="success"
                  className="flex-1 transition-all duration-300 h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Go to Dashboard
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // Calculate progress percentage
  const progressPercentage = ((currentStep - 1) / 3) * 100;

  if(DISABLE_SIGNUP) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <Card className="w-full max-w-sm p-1">
          <CardHeader>
            <Image src="/rybbit.png" alt="Rybbit" width={32} height={32} />
            <CardTitle className="text-2xl flex justify-center">
              Sign Up Disabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <p className="text-center">New account registration is currently disabled. If you have an account, you can
                {" "}<Link href="/login" className="underline">sign in</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4 relative overflow-hidden">
      {/* Suspense boundary for the URL parameter handler */}
      <Suspense fallback={null}>
        <StepHandler onSetStep={setCurrentStep} />
      </Suspense>

      {/* Background gradients similar to docs page */}
      <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/40 rounded-full blur-[80px] opacity-40"></div>
      <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/30 rounded-full blur-[70px] opacity-30"></div>

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[80px] opacity-30"></div>
      <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/30 rounded-full blur-[75px] opacity-30"></div>

      <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/40 rounded-full blur-[70px] opacity-20"></div>

      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl border-neutral-700/50 backdrop-blur-sm bg-neutral-800/20 relative z-10">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left sidebar with steps */}
          <div className="md:w-80 p-6 relative overflow-hidden border-r border-neutral-700/50 backdrop-blur-sm bg-neutral-800/30">
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted-foreground/20 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="relative z-10 flex flex-col space-y-4">
              <Logo size="xlarge" />

              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn("flex items-center space-x-3 py-3", currentStep === step ? "text-emerald-400 font-medium" : currentStep > step ? "text-muted-foreground" : "text-muted-foreground/60")}                  
                >
                  <div
                    className={cn("flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300", currentStep === step ? "bg-emerald-600 text-primary-foreground" : currentStep > step ? "bg-emerald-600/20 text-emerald-400" : "bg-muted-foreground/20 text-muted-foreground")}                    
                  >
                    {currentStep > step ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      getStepIcon(step)
                    )}
                  </div>
                  <span>
                    {step === 1 && "Create account"}
                    {step === 2 && "Create organization"}
                    {step === 3 && "Add website"}
                    {step === 4 && "Track your first pageview"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right content area */}
          <div className="p-6 md:p-8 flex-1 h-[600px] flex flex-col backdrop-blur-sm bg-neutral-900/50">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex-1 flex flex-col justify-between">
              <div className="min-h-[400px]">{renderStepContent()}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
