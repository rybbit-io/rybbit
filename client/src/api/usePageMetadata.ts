import { useQuery } from "@tanstack/react-query";

interface PageMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  favicon?: string;
}

export function usePageMetadata(pageUrl: string | null) {
  return useQuery({
    queryKey: ["page-metadata", pageUrl],
    queryFn: async (): Promise<PageMetadata> => {
      if (!pageUrl) {
        return {};
      }

      try {
        // Using Microlink to fetch metadata
        const response = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(pageUrl)}&meta=true&screenshot=false`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract relevant metadata
        return {
          title: data.data?.title,
          description: data.data?.description,
          image: data.data?.ogImage?.url || data.data?.image?.url,
          url: data.data?.url,
          siteName: data.data?.publisher,
          favicon: data.data?.logo?.url,
        };
      } catch (error) {
        console.error("Error fetching page metadata:", error);
        throw error;
      }
    },
    enabled: !!pageUrl, // Only run the query if pageUrl is provided
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    retry: 1, // Only retry once if failed
  });
}
