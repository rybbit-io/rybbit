import { FastifyRequest, FastifyReply } from "fastify";
import { createRequire } from "module";
import { DISABLE_SIGNUP, INTERNAL_AUTHENTICATION_ENABLED, MAPBOX_TOKEN, getOIDCProviders, getSocialProviders } from "../lib/const.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

export async function getConfig(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    disableSignup: DISABLE_SIGNUP,
    internalAuthEnabled: INTERNAL_AUTHENTICATION_ENABLED,
    mapboxToken: MAPBOX_TOKEN,
    enabledOIDCProviders: getOIDCProviders().map((provider) => {
      return {
        providerId: provider.providerId,
        name: provider.name,
      }
    }),
    enabledSocialProviders: Object.keys(getSocialProviders()),
  });
}

export async function getVersion(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({ version });
}
