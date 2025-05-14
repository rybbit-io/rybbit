export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL === "http://localhost:3001"
    ? "http://localhost:3001"
    : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;
export const DISABLE_SIGNUP = process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true";
export const IS_CLOUD = process.env.NEXT_PUBLIC_CLOUD === "true";
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "true";
