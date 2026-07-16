"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetSiteImports, useCreateSiteImport, useDeleteSiteImport } from "@/api/admin/hooks/useImport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IS_CLOUD } from "@/lib/const";
import { CsvParser } from "@/lib/import/csvParser";
import { PlausibleCsvParser } from "@/lib/import/plausibleParser";
import { ImportPlatform } from "@/types/import";
import { DisabledOverlay } from "@/components/DisabledOverlay";

import { SettingsSection, SettingsSections } from "./SettingsSection";

interface ImportManagerProps {
  siteId: number;
  disabled: boolean;
}

const CONFIRM_THRESHOLD = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  const sizeInMB = bytes / 1024 / 1024;
  const sizeInGB = bytes / 1024 / 1024 / 1024;

  if (sizeInGB < 1) {
    return `${sizeInMB.toFixed(2)} MB`;
  } else {
    return `${sizeInGB.toFixed(2)} GB`;
  }
}

function formatPlatformName(platform: ImportPlatform): string {
  const platformNames: Record<ImportPlatform, string> = {
    umami: "Umami",
    simple_analytics: "Simple Analytics",
    plausible: "Plausible",
  };
  return platformNames[platform];
}

export function ImportManager({ siteId, disabled }: ImportManagerProps) {
  const t = useExtracted();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [importToDelete, setImportToDelete] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<ImportPlatform | "">("");
  const [fileError, setFileError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerManagerRef = useRef<CsvParser | PlausibleCsvParser | null>(null);

  function validateFile(file: File | null, platform: ImportPlatform | ""): string {
    if (!file) {
      return t("Please select a file");
    }

    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (platform === "plausible") {
      if (extension !== ".zip" && !["application/zip", "application/x-zip-compressed"].includes(file.type)) {
        return t("Please upload a ZIP file exported from Plausible");
      }
    } else {
      if (extension !== ".csv" && file.type !== "text/csv") {
        return t("Only CSV files are accepted");
      }
    }

    return "";
  }

  const { data, isLoading, error } = useGetSiteImports(siteId);
  const createImportMutation = useCreateSiteImport(siteId);
  const deleteMutation = useDeleteSiteImport(siteId);

  useEffect(() => {
    return () => {
      workerManagerRef.current?.cancel();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setFileError(validateFile(file, selectedPlatform));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || fileError) return;

    if (selectedFile.size > CONFIRM_THRESHOLD) {
      setShowConfirmDialog(true);
    } else {
      executeImport();
    }
  };

  const executeImport = () => {
    if (!selectedFile || !selectedPlatform) return;

    createImportMutation.mutate(
      { platform: selectedPlatform },
      {
        onSuccess: response => {
          const { importId, allowedDateRange } = response.data;

          if (selectedPlatform === "plausible") {
            const parser = new PlausibleCsvParser(
              siteId,
              importId,
              allowedDateRange.earliestAllowedDate,
              allowedDateRange.latestAllowedDate
            );
            workerManagerRef.current = parser;
            parser.startImport(selectedFile).catch(err => {
              console.error("Plausible import failed:", err);
            });
          } else {
            const parser = new CsvParser(
              siteId,
              importId,
              selectedPlatform,
              allowedDateRange.earliestAllowedDate,
              allowedDateRange.latestAllowedDate
            );
            workerManagerRef.current = parser;
            parser.startImport(selectedFile);
          }

          setSelectedFile(null);
          setSelectedPlatform("");
          setFileError("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      }
    );

    setShowConfirmDialog(false);
  };

  const handleDeleteClick = (importId: string) => {
    setImportToDelete(importId);
  };

  const handleDeleteConfirm = () => {
    if (importToDelete) {
      deleteMutation.mutate(importToDelete, {
        onSuccess: () => {
          setImportToDelete(null);
        },
        onError: () => {
          setImportToDelete(null);
        },
      });
    }
  };

  const getStatusInfo = (completedAt: string | null) => {
    if (completedAt === null) {
      return {
        variant: "info" as const,
        icon: Loader2,
        label: t("In Progress"),
      };
    } else {
      return {
        variant: "success" as const,
        icon: CheckCircle2,
        label: t("Completed"),
      };
    }
  };

  const sortedImports = useMemo(() => {
    if (!data?.data) {
      return [];
    }

    return data.data.toSorted((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return bTime - aTime;
    });
  }, [data?.data]);

  const hasActiveImport = IS_CLOUD && sortedImports.some(imp => imp.completedAt === null);

  const isImportDisabled =
    !selectedFile || !selectedPlatform || !!fileError || createImportMutation.isPending || disabled || hasActiveImport;

  return (
    <DisabledOverlay message="Data Import" requiredPlan="standard">
      <SettingsSections>
        <SettingsSection title={t("Import Data")} description={t("Import data from other analytics platforms.")}>
          {/* Active Import Warning */}
          {hasActiveImport && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t(
                  "You have an active import in progress. Please wait for it to complete before starting a new import."
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label htmlFor="platform">{t("Platform")}</Label>
              <Select
                value={selectedPlatform}
                onValueChange={(value: ImportPlatform) => {
                  setSelectedPlatform(value);
                  setSelectedFile(null);
                  setFileError("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                <SelectTrigger id="platform" disabled={disabled || createImportMutation.isPending || hasActiveImport}>
                  <SelectValue placeholder={t("Select platform")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="umami">Umami</SelectItem>
                  <SelectItem value="simple_analytics">Simple Analytics</SelectItem>
                  <SelectItem value="plausible">Plausible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">{selectedPlatform === "plausible" ? t("ZIP File") : t("CSV File")}</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept={selectedPlatform === "plausible" ? ".zip" : ".csv"}
                multiple={false}
                onChange={handleFileChange}
                disabled={disabled || createImportMutation.isPending || hasActiveImport}
              />
              {fileError && <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>}
            </div>

            {/* Import Button */}
            <Button type="submit" disabled={isImportDisabled} className="w-full sm:w-auto">
              {createImportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("Importing...")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("Import")}
                </>
              )}
            </Button>
          </form>

          {/* Import Error */}
          {createImportMutation.isError && (
            <Alert variant="destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {createImportMutation.error.message || t("Failed to import file. Please try again.")}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Delete Error Message */}
          {deleteMutation.isError && (
            <Alert variant="destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {deleteMutation.error.message || t("Failed to delete import. Please try again.")}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </SettingsSection>

        <SettingsSection title={t("Import History")} description={t("Track the status of your data imports")}>
          {isLoading && !data ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("Loading import history...")}</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("Failed to load import history. Please try refreshing the page.")}</AlertDescription>
            </Alert>
          ) : !data?.data?.length ? (
            <div className="rounded-lg border border-dashed border-neutral-300 py-8 text-center text-muted-foreground dark:border-neutral-800">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">{t("No imports yet")}</p>
              <p className="text-xs">{t("Upload a CSV file to get started")}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-150 dark:border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Started At")}</TableHead>
                    <TableHead>{t("Platform")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="text-right">{t("Imported")}</TableHead>
                    <TableHead className="text-right">{t("Skipped")}</TableHead>
                    <TableHead className="text-right">{t("Invalid")}</TableHead>
                    <TableHead className="text-center">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedImports.map(imp => {
                    const statusInfo = getStatusInfo(imp.completedAt);
                    const StatusIcon = statusInfo.icon;
                    const startedAt = DateTime.fromSQL(imp.startedAt).toFormat("MMM dd, yyyy HH:mm");

                    return (
                      <TableRow key={imp.importId}>
                        <TableCell className="font-medium">{startedAt}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatPlatformName(imp.platform)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className={`h-3 w-3 ${imp.completedAt === null ? "animate-spin" : ""}`} />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{imp.importedEvents.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {imp.skippedEvents > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-yellow-600 dark:text-yellow-400">
                                    {imp.skippedEvents.toLocaleString()}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">{t("Events exceeded quota or date range limits")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {imp.invalidEvents > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-red-600 dark:text-red-400">
                                    {imp.invalidEvents.toLocaleString()}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">{t("Events failed validation")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {imp.completedAt !== null && (
                            <Button
                              variant="outline"
                              size="smIcon"
                              onClick={() => handleDeleteClick(imp.importId)}
                              disabled={disabled || deleteMutation.isPending}
                            >
                              {deleteMutation.isPending && deleteMutation.variables === imp.importId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SettingsSection>
      </SettingsSections>

      <div>
        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Confirm Large File Import")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "You're about to import a large file ({size}). This may take several minutes to process. Are you sure you want to continue?",
                  { size: selectedFile ? formatFileSize(selectedFile.size) : "?" }
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={executeImport}>{t("Yes, Import File")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!importToDelete} onOpenChange={open => !open && setImportToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete Import")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "Are you sure you want to delete this import? This action cannot be undone. The imported data will be permanently removed."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">
                {t("Delete Import")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DisabledOverlay>
  );
}
