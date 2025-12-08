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

/**
 * Create a ZIP file containing multiple CSVs and trigger download
 */
export async function downloadZip(
  files: CSVFile[],
  zipFilename: string
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.data.length > 0) {
      const csvContent = generateCSV(file.data);
      zip.file(file.filename, csvContent);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });

  // Create download link and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a date for use in filenames
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}
