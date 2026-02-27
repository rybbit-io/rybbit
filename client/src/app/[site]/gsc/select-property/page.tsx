"use client";

import { useExtracted } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { authedFetch } from "@/api/utils";
import { useQueryState, parseAsJson } from "nuqs";

function SelectGSCPropertyPageContent() {
  const t = useExtracted();
  const params = useParams();
  const router = useRouter();
  const site = params.site as string;

  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse properties from query params
  const [properties] = useQueryState("properties", parseAsJson<string[]>(value => value as string[]).withDefault([]));

  const handleSubmit = async () => {
    if (!selectedProperty) {
      toast.error(t("Please select a property"));
      return;
    }

    setIsSubmitting(true);
    try {
      await authedFetch(`/sites/${site}/gsc/select-property`, undefined, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          propertyUrl: selectedProperty,
        },
      });

      toast.success(t("Google Search Console connected successfully"));
      // Redirect to main page
      router.push(`/${site}/main`);
    } catch (error) {
      console.error("Error selecting property:", error);
      toast.error(t("Failed to connect property"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("No Properties Found")}</CardTitle>
            <CardDescription>{t("No Google Search Console properties were found for your account.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/${site}/main`)}>{t("Go to Dashboard")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t("Select Google Search Console Property")}</CardTitle>
          <CardDescription>{t("Choose which Search Console property you want to connect to this site")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedProperty} onValueChange={setSelectedProperty}>
            {properties.map(property => (
              <div
                key={property}
                className="flex items-center space-x-2 border border-neutral-100 dark:border-neutral-750 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
              >
                <RadioGroupItem value={property} id={property} />
                <Label htmlFor={property} className="flex-1 cursor-pointer">
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {property.startsWith("sc-domain:") ? property.replace("sc-domain:", "") : property}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {property.startsWith("sc-domain:") ? t("Domain property") : t("URL prefix property")}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!selectedProperty || isSubmitting}
              className="flex-1"
              variant="success"
            >
              {isSubmitting ? t("Connecting...") : t("Connect Property")}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/${site}/main`)} disabled={isSubmitting}>
              {t("Cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SelectGSCPropertyPage() {
  return (
    <Suspense fallback={null}>
      <SelectGSCPropertyPageContent />
    </Suspense>
  );
}
