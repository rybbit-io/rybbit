export function useAppEnv() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  if (hostname === "demo.rybbit.com") {
    return "demo";
  }
  if (hostname === "app.rybbit.io") {
    return "prod";
  }

  return null;
}
