import { FastifyRequest, FastifyReply } from "fastify";
import { createRequire } from "module";
import {
  DISABLE_SIGNUP,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  LITE_DASHBOARD,
  MAPBOX_TOKEN,
} from "../lib/const.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

export async function getConfig(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    disableSignup: DISABLE_SIGNUP,
    mapboxToken: MAPBOX_TOKEN,
    liteDashboard: LITE_DASHBOARD,
    // Google Search Console is available whenever OAuth credentials are
    // configured. Self-hosters get it by setting GOOGLE_CLIENT_ID and
    // GOOGLE_CLIENT_SECRET, exactly as self-host-vs-cloud.mdx documents.
    // Only the boolean is exposed — /api/config is public.
    gscEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  });
}

export async function getVersion(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({ version });
}
