import { FastifyRequest, FastifyReply } from "fastify";
import { getSessionFromReq } from "../lib/auth-utils.js";

export async function createContext({
  req,
  res,
}: {
  req: FastifyRequest;
  res: FastifyReply;
}) {
  const session = await getSessionFromReq(req).catch(() => null);

  return {
    req,
    res,
    user: session?.user || null,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
