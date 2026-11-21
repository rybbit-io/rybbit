"use client";

import { DPA_FIELD_LIMITS, DPA_VERSION, type DpaCustomerDetails } from "@rybbit/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileSignature } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { useSignDpa } from "@/api/admin/hooks/useDpa";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { downloadBlob } from "@/lib/export";
import { LedgerRow, LedgerRows, LedgerSection } from "../../components/Ledger";
import { DpaPreview } from "./DpaPreview";

type FormValues = DpaCustomerDetails & { agreed: boolean };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{message}</p>;
}

function pdfBlob(base64: string) {
  return new Blob([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], { type: "application/pdf" });
}

export function SignDpaForm({
  organizationId,
  defaults,
}: {
  organizationId: string;
  /** Prefill from the signed-in user. */
  defaults: Partial<DpaCustomerDetails>;
}) {
  const t = useExtracted();
  const signDpa = useSignDpa();

  const schema = useMemo(() => {
    const required = (max: number) =>
      z
        .string()
        .trim()
        .min(1, t("Required"))
        .max(max, t("Keep it under {max} characters", { max: String(max) }));
    return z.object({
      companyName: required(DPA_FIELD_LIMITS.companyName),
      companyAddress: required(DPA_FIELD_LIMITS.companyAddress),
      signerName: required(DPA_FIELD_LIMITS.signerName),
      signerTitle: required(DPA_FIELD_LIMITS.signerTitle),
      signerEmail: z.string().trim().max(DPA_FIELD_LIMITS.signerEmail).email(t("Enter a valid email address")),
      agreed: z.boolean().refine(value => value, t("Confirm you can sign for the company")),
    });
  }, [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      signerName: "",
      signerTitle: "",
      signerEmail: "",
      ...defaults,
      agreed: false,
    },
  });
  const { errors } = form.formState;
  const values = useWatch({ control: form.control }) as FormValues;

  const onSubmit = form.handleSubmit(async ({ agreed: _agreed, ...details }) => {
    try {
      const result = await signDpa.mutateAsync({
        organizationId,
        data: { ...details, dpaVersion: DPA_VERSION, agreed: true },
      });
      // Rybbit keeps no copy, so hand over the PDF right away.
      downloadBlob(result.filename, pdfBlob(result.pdf));
      toast.success(
        result.emailed
          ? t("DPA signed. The PDF is downloading, and we emailed a copy to {email}.", { email: details.signerEmail })
          : t("DPA signed. The PDF is downloading. We couldn't email it, so keep that copy safe.")
      );
      form.reset({ ...details, agreed: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Couldn't sign the DPA"));
    }
  });

  const company = values.companyName?.trim();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-12" noValidate>
      <LedgerSection
        title={t("Your company")}
        description={t("The details that go into the agreement, exactly as they should appear on it.")}
      >
        <LedgerRows>
          <LedgerRow
            label={t("Company legal name")}
            description={t("The registered name of the company signing.")}
            htmlFor="dpa-company-name"
          >
            <Input
              id="dpa-company-name"
              autoComplete="organization"
              aria-invalid={!!errors.companyName}
              {...form.register("companyName")}
            />
            <FieldError message={errors.companyName?.message} />
          </LedgerRow>
          <LedgerRow label={t("Registered address")} htmlFor="dpa-company-address">
            <Textarea
              id="dpa-company-address"
              rows={3}
              autoComplete="street-address"
              aria-invalid={!!errors.companyAddress}
              {...form.register("companyAddress")}
            />
            <FieldError message={errors.companyAddress?.message} />
          </LedgerRow>
          <LedgerRow
            label={t("Signer's name")}
            description={t("Someone who can sign contracts for the company.")}
            htmlFor="dpa-signer-name"
          >
            <Input
              id="dpa-signer-name"
              autoComplete="name"
              aria-invalid={!!errors.signerName}
              {...form.register("signerName")}
            />
            <FieldError message={errors.signerName?.message} />
          </LedgerRow>
          <LedgerRow label={t("Signer's title")} htmlFor="dpa-signer-title">
            <Input
              id="dpa-signer-title"
              autoComplete="organization-title"
              placeholder={t("e.g. CEO")}
              aria-invalid={!!errors.signerTitle}
              {...form.register("signerTitle")}
            />
            <FieldError message={errors.signerTitle?.message} />
          </LedgerRow>
          <LedgerRow
            label={t("Signer's email")}
            description={t("We send the countersigned PDF here.")}
            htmlFor="dpa-signer-email"
          >
            <Input
              id="dpa-signer-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.signerEmail}
              {...form.register("signerEmail")}
            />
            <FieldError message={errors.signerEmail?.message} />
          </LedgerRow>
        </LedgerRows>
      </LedgerSection>

      <LedgerSection
        title={t("Review and sign")}
        description={t(
          "Rybbit has already signed. It takes effect when you sign. The PDF downloads right away and we email you a copy. To get another copy later, sign again."
        )}
      >
        <div
          className="max-h-[28rem] overflow-y-auto rounded-lg border border-neutral-150 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          tabIndex={0}
          aria-label={t("Agreement text")}
        >
          <DpaPreview
            details={{
              companyName: values.companyName ?? "",
              companyAddress: values.companyAddress ?? "",
              signerName: values.signerName ?? "",
              signerTitle: values.signerTitle ?? "",
              signerEmail: values.signerEmail ?? "",
            }}
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label className="flex items-start gap-3 text-sm">
              <Controller
                control={form.control}
                name="agreed"
                render={({ field }) => (
                  <Checkbox
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={checked => field.onChange(checked === true)}
                    aria-invalid={!!errors.agreed}
                  />
                )}
              />
              <span>
                {company
                  ? t(
                      "I'm authorized to sign for {company}, and I agree to this Data Processing Agreement on its behalf.",
                      {
                        company,
                      }
                    )
                  : t(
                      "I'm authorized to sign for my company, and I agree to this Data Processing Agreement on its behalf."
                    )}
              </span>
            </label>
            <FieldError message={errors.agreed?.message} />
            {values.signerName?.trim() && (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {t("Your typed name is your signature:")}{" "}
                <span className="font-serif text-base text-neutral-900 italic dark:text-neutral-100">
                  {values.signerName}
                </span>
              </p>
            )}
          </div>
          <Button type="submit" variant="success" loading={signDpa.isPending} loadingLabel={t("Signing...")}>
            <FileSignature />
            {t("Sign DPA")}
          </Button>
        </div>
      </LedgerSection>
    </form>
  );
}
