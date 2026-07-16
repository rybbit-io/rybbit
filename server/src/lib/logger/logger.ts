import type { FastifyBaseLogger } from "fastify";
import { pino } from "pino";

export const createLogger = (name: string): FastifyBaseLogger => {
  return pino({
    name,
    level: process.env.LOG_LEVEL || "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname,name",
      },
    },
  }) as FastifyBaseLogger;
};

export const logger = createLogger("rybbit");

export const createServiceLogger = (service: string) => {
  return logger.child({ service });
};
