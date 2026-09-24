"use client";

import { useExtracted } from "next-intl";
import Link from "next/link";
import { Home, ArrowLeft, BarChart3 } from "lucide-react";
import { StandardPage } from "../components/StandardPage";
import { useSetPageTitle } from "../hooks/useSetPageTitle";
import { Footer } from "./components/Footer";
import { Button } from "../components/ui/button";

export default function NotFound() {
  const t = useExtracted();
  useSetPageTitle("Page Not Found");

  return (
    <StandardPage>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
        {/* 404 Icon and Number */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <BarChart3 className="h-24 w-24 text-neutral-400" />
          </div>
          <h1 className="text-6xl font-bold text-neutral-900 dark:text-neutral-100">{t("404")}</h1>
        </div>

        {/* Error Message */}
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">{t("Page Not Found")}</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {t("The page you're looking for doesn't exist or has been moved. Let's get you back to analyzing your data.")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button asChild variant="default" size="lg">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t("Go to Dashboard")}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg">
            <Link href="javascript:history.back()" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("Go Back")}
            </Link>
          </Button>
        </div>

        {/* Help Links */}
        <div className="pt-8 space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Need help? Check out our resources:")}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="https://rybbit.com/docs"
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 underline-offset-4 hover:underline"
            >
              {t("Documentation")}
            </Link>
            <Link
              href="https://github.com/rybbit-io/rybbit"
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 underline-offset-4 hover:underline"
            >
              {t("GitHub")}
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </StandardPage>
  );
}
