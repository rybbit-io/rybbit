import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { getSessionFromReq } from "./lib/auth-utils.js";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  try {
    const session = await getSessionFromReq(req);
    return { req, res, user: session?.user || null };
  } catch (error) {
    console.error("Error getting session in TRPC context:", error);
    return { req, res, user: null };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
