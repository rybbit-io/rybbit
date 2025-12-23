import { FastifyRequest, FastifyReply } from "fastify";
import { DISABLE_SIGNUP, MAPBOX_TOKEN } from "../lib/const.js";

export async function getConfig(_: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    disableSignup: DISABLE_SIGNUP,
    mapboxToken: MAPBOX_TOKEN,
  });
}
