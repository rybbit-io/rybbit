import { useEffect, useState } from "react";

export function useGithubStarCount() {
  const [starCount, setStarCount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/rybbit-io/rybbit");
        const data = await response.json();

        if (data.stargazers_count) {
          setStarCount(data.stargazers_count.toLocaleString());
        }
      } catch (error) {
        console.log("Could not fetch GitHub stars:", error);
        setStarCount(null); // Explicitly set to null on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchStarCount();
  }, []);

  return { starCount, isLoading };
}
