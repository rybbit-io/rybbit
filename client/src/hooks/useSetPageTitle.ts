import { useEffect } from "react";

export const useSetPageTitle = (title: string) => {
  useEffect(() => {
    if (title) {
      title = title.replace("Rybbit", "Vision Analytics")
      document.title = title;
    }
  }, [title]);
};
