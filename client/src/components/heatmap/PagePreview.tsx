"use client";

import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PagePreviewProps {
  pageUrl: string;
  width: number;
  height: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function PagePreview({ pageUrl, width, height, onLoad, onError }: PagePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setLoadError(null);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    const errorMessage = "Unable to load page preview. The page may block embedding or require authentication.";
    setIsLoading(false);
    setLoadError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
  }, [pageUrl]);

  // Set a timeout to detect if iframe fails to load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        // If still loading after 10 seconds, assume it failed
        setIsLoading(false);
        // Don't set error - the page might still be loading slowly
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [pageUrl, isLoading]);

  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
        style={{ width, height }}
      >
        <AlertCircle className="w-12 h-12 text-neutral-400 mb-4" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-md px-4">{loadError}</p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600"
        >
          Open page in new tab
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg"
          style={{ width, height }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={pageUrl}
        width={width}
        height={height}
        className="rounded-lg border border-neutral-200 dark:border-neutral-700"
        style={{
          pointerEvents: "none",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.2s ease-in-out",
        }}
        sandbox="allow-same-origin"
        onLoad={handleLoad}
        onError={handleError}
        title="Page Preview"
      />
    </div>
  );
}
