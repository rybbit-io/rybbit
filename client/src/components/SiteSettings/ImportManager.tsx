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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetSiteImports, useCreateSiteImport, useDeleteSiteImport } from "@/api/admin/hooks/useImport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IS_CLOUD } from "@/lib/const";
import { CsvParser } from "@/lib/import/csvParser";
import { ImportPlatform } from "@/types/import";
import { DisabledOverlay } from "@/components/DisabledOverlay";

interface ImportManagerProps {
  siteId: number;
  disabled: boolean;
}

const CONFIRM_THRESHOLD = 100 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["text/csv"];
const ALLOWED_EXTENSIONS = [".csv"];

function validateFile(file: File | null, t: (key: string) => string): string {
  if (!file) {
    return t("Please select a file");
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension) && !ALLOWED_FILE_TYPES.includes(file.type)) {
    return t("Only CSV files are accepted");
  }

  return "";
}

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
  const workerManagerRef = useRef<CsvParser | null>(null);

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
    setFileError(validateFile(file, t));
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

          workerManagerRef.current = new CsvParser(
            siteId,
            importId,
            selectedPlatform,
            allowedDateRange.earliestAllowedDate,
            allowedDateRange.latestAllowedDate
          );

          workerManagerRef.current.startImport(selectedFile);

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
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Loader2,
        label: t("In Progress"),
      };
    } else {
      return {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle2,
        label: t("Completed"),
      };
    }
  };

  const sortedImports = useMemo(() => {
    if (!data?.data) {
      return [];
    }

    return [...data.data].sort((a, b) => {
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
      <div className="space-y-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("Import Data")}
            </CardTitle>
            <CardDescription>{t("Import data from other analytics platforms.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Import Warning */}
            {hasActiveImport && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("You have an active import in progress. Please wait for it to complete before starting a new import.")}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform">{t("Platform")}</Label>
                <Select value={selectedPlatform} onValueChange={(value: ImportPlatform) => setSelectedPlatform(value)}>
                  <SelectTrigger id="platform" disabled={disabled || createImportMutation.isPending || hasActiveImport}>
                    <SelectValue placeholder={t("Select platform")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umami">Umami</SelectItem>
                    <SelectItem value="simple_analytics">Simple Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("CSV File")}
                </Label>
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".csv"
                  multiple={false}
                  onChange={handleFileChange}
                  disabled={disabled || createImportMutation.isPending || hasActiveImport}
                />
                {fileError && <p className="text-sm text-red-600">{fileError}</p>}
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
          </CardContent>
        </Card>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Import History")}</CardTitle>
            <CardDescription>{t("Track the status of your data imports")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t("Loading import history...")}</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("Failed to load import history. Please try refreshing the page.")}</AlertDescription>
              </Alert>
            ) : !data?.data?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("No imports yet")}</p>
                <p className="text-sm">{t("Upload a CSV file to get started")}</p>
              </div>
            ) : (
              <div className="rounded-md">
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
                            <Badge className={`${statusInfo.color} flex items-center gap-1`}>
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
                                    <span className="text-yellow-600 cursor-help">
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
                                    <span className="text-red-600 cursor-help">
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
                                size="sm"
                                onClick={() => handleDeleteClick(imp.importId)}
                                disabled={disabled || deleteMutation.isPending}
                                className="h-8 w-8 p-0"
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
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Confirm Large File Import")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("You're about to import a large file ({size}). This may take several minutes to process. Are you sure you want to continue?", { size: selectedFile ? formatFileSize(selectedFile.size) : "?" })}
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
                {t("Are you sure you want to delete this import? This action cannot be undone. The imported data will be permanently removed.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                {t("Delete Import")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DisabledOverlay>
  );
}
