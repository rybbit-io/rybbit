"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authedFetch } from "@/api/utils";

export default function SelectGSCPropertyPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const site = params.site as string;

  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse properties from query params
  const propertiesParam = searchParams.get("properties");
  const properties: string[] = propertiesParam ? JSON.parse(decodeURIComponent(propertiesParam)) : [];

  const handleSubmit = async () => {
    if (!selectedProperty) {
      toast.error("Please select a property");
      return;
    }

    setIsSubmitting(true);
    try {
      await authedFetch(`/gsc/select-property/${site}`, undefined, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          propertyUrl: selectedProperty,
        },
      });

      toast.success("Google Search Console connected successfully");
      // Redirect to main page
      router.push(`/${site}/main`);
    } catch (error) {
      console.error("Error selecting property:", error);
      toast.error("Failed to connect property");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Properties Found</CardTitle>
            <CardDescription>No Google Search Console properties were found for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/${site}/main`)}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Google Search Console Property</CardTitle>
          <CardDescription>Choose which Search Console property you want to connect to this site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedProperty} onValueChange={setSelectedProperty}>
            {properties.map(property => (
              <div
                key={property}
                className="flex items-center space-x-2 border border-neutral-100 dark:border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
              >
                <RadioGroupItem value={property} id={property} />
                <Label htmlFor={property} className="flex-1 cursor-pointer">
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {property.startsWith("sc-domain:") ? property.replace("sc-domain:", "") : property}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {property.startsWith("sc-domain:") ? "Domain property" : "URL prefix property"}
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
              {isSubmitting ? "Connecting..." : "Connect Property"}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/${site}/main`)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
