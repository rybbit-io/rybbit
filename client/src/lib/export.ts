import JSZip from "jszip";
import Papa from "papaparse";

export type CSVFile = {
  filename: string;
  data: Record<string, unknown>[];
};

/**
 * Generate a CSV string from an array of objects
 */
export function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return "";
  }
  return Papa.unparse(data);
}

function normalizeCsvValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

export function generateCSVWithColumns(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0 && columns.length === 0) {
    return "";
  }

  return Papa.unparse({
    fields: columns,
    data: data.map(row => columns.map(column => normalizeCsvValue(row[column]))),
  });
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadFile(filename: string, content: string, type: string): void {
  downloadBlob(filename, new Blob([content], { type }));
}

export function downloadCSV(filename: string, data: Record<string, unknown>[], columns?: string[]): void {
  const csvContent = columns ? generateCSVWithColumns(data, columns) : generateCSV(data);
  downloadFile(filename, csvContent, "text/csv;charset=utf-8");
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

/**
 * Create a ZIP file containing multiple CSVs and trigger download
 */
export async function downloadZip(files: CSVFile[], zipFilename: string): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.data.length > 0) {
      const csvContent = generateCSV(file.data);
      zip.file(file.filename, csvContent);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });

  downloadBlob(zipFilename, blob);
}

/**
 * Format a date for use in filenames
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}
