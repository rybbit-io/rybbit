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
    // Boolean only: /api/config is public, so the credentials must not leak.
    gscEnabled: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  });
}

export async function getVersion(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({ version });
}
