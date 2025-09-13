import { FastifyRequest, FastifyReply } from 'fastify';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const clientIp = request.ip;
  
  logger.debug({ 
    clientIp, 
    allowedIPs: CONFIG.ALLOWED_IPS,
    allowedIPsLength: CONFIG.ALLOWED_IPS.length,
    rawEnv: process.env.ALLOWED_IPS 
  }, 'Checking IP whitelist');
  
  // If no IPs are whitelisted, allow all (with warning)
  if (CONFIG.ALLOWED_IPS.length === 0) {
    logger.debug({ ip: clientIp }, 'No IP whitelist configured, allowing request');
    return;
  }
  
  // Check IP whitelist
  if (!CONFIG.ALLOWED_IPS.includes(clientIp)) {
    logger.warn({ 
      ip: clientIp, 
      allowedIps: CONFIG.ALLOWED_IPS 
    }, 'Request from non-whitelisted IP');
    
    return reply.code(403).send({ 
      error: 'Forbidden',
      message: 'Your IP address is not authorized to access this service'
    });
  }
  
  logger.debug({ ip: clientIp }, 'Request from whitelisted IP');
}