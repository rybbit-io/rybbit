import pino from 'pino';
import { CONFIG } from '../config.js';

export const logger = pino({
  level: CONFIG.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss Z',
    },
  },
  base: {
    region: CONFIG.REGION,
  },
});