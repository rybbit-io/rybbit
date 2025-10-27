/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BACKEND_URL?: string;
    NEXT_PUBLIC_CLOUD?: string;
    NEXT_PUBLIC_DISABLE_SIGNUP?: string;
  }
}