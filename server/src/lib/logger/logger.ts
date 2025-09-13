import type { FastifyBaseLogger } from "fastify";
import { pino } from "pino";
import { IS_CLOUD } from "../const.js";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const hasAxiom = !!(process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN);

export const createLogger = (name: string): FastifyBaseLogger => {
  // Production with Axiom - send to both Axiom and stdout
  if (isProduction && hasAxiom && IS_CLOUD) {
    return pino({
      name,
      level: process.env.LOG_LEVEL || "info",
      transport: {
        targets: [
          // Send to Axiom
          {
            target: "@axiomhq/pino",
            level: process.env.LOG_LEVEL || "info",
            options: {
              dataset: process.env.AXIOM_DATASET,
              token: process.env.AXIOM_TOKEN,
            },
          },
          // Pretty print to stdout for Docker logs
          {
            target: "pino-pretty",
            level: process.env.LOG_LEVEL || "info",
            options: {
              colorize: true,
              singleLine: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname,name",
              destination: 1, // stdout
            },
          },
        ],
      },
    }) as FastifyBaseLogger;
  }

  // Development mode with pretty printing
  if (isDevelopment) {
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
  }

  // Production without Axiom - plain JSON to stdout
  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
  }) as FastifyBaseLogger;
};

export const logger = createLogger("rybbit");

export const createServiceLogger = (service: string) => {
  return logger.child({ service });
};
