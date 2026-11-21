import { openApiResponse } from "@/lib/openapi";

export const dynamic = "force-static";
export const revalidate = false;

export function GET() {
  return openApiResponse();
}

export function HEAD() {
  return openApiResponse(false);
}
