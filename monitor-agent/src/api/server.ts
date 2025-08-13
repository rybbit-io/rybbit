import Fastify from 'fastify';
import cors from '@fastify/cors';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';
import { authenticateRequest } from './auth.js';
import { ExecuteRequest, ExecuteResponse, HttpCheckResult, TcpCheckResult } from '../types.js';
import { performHttpCheck } from '../monitors/http.js';
import { performTcpCheck } from '../monitors/tcp.js';
import { applyValidationRules } from '../utils/validation.js';

export async function createServer() {
  const fastify = Fastify({
    logger: false, // We use our own logger
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: false, // Accept requests from any origin
  });

  // Health check endpoint (no auth required)
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      region: CONFIG.REGION,
      timestamp: new Date().toISOString(),
    };
  });

  // Metrics endpoint (no auth required)
  fastify.get('/metrics', async (_request, reply) => {
    // TODO: Implement Prometheus metrics
    reply.type('text/plain');
    return '# Metrics endpoint not yet implemented';
  });

  // Execute monitoring check
  fastify.post<{ Body: ExecuteRequest }>(
    '/execute',
    {
      preHandler: authenticateRequest,
      schema: {
        body: {
          type: 'object',
          required: ['jobId', 'monitorId', 'monitorType', 'config'],
          properties: {
            jobId: { type: 'string' },
            monitorId: { type: 'number' },
            monitorType: { type: 'string', enum: ['http', 'tcp', 'dns', 'smtp', 'ping'] },
            config: { type: 'object' },
            validationRules: { type: 'array', default: [] },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId, monitorId, monitorType, config, validationRules } = request.body;
      
      logger.info({ jobId, monitorId, monitorType }, 'Executing monitor check');
      
      try {
        let result;
        
        switch (monitorType) {
          case 'http':
            result = await performHttpCheck(config);
            break;
          case 'tcp':
            result = await performTcpCheck(config);
            break;
          case 'dns':
            // TODO: Implement DNS check
            return reply.code(501).send({ error: 'DNS monitoring not yet implemented' });
          case 'smtp':
            // TODO: Implement SMTP check
            return reply.code(501).send({ error: 'SMTP monitoring not yet implemented' });
          case 'ping':
            // TODO: Implement PING check
            return reply.code(501).send({ error: 'PING monitoring not yet implemented' });
          default:
            return reply.code(400).send({ error: `Unknown monitor type: ${monitorType}` });
        }
        
        // Apply validation rules (only for HTTP checks)
        if (result.status === 'success' && validationRules.length > 0 && monitorType === 'http') {
          const httpResult = result as HttpCheckResult;
          const validationErrors = applyValidationRules(httpResult, validationRules);
          if (validationErrors.length > 0) {
            httpResult.validationErrors = validationErrors;
            httpResult.status = 'failure';
          }
        }
        
        const response: ExecuteResponse = {
          jobId,
          region: CONFIG.REGION,
          status: result.status,
          responseTimeMs: result.responseTimeMs,
          error: result.error,
        };
        
        // Add HTTP-specific fields
        if (monitorType === 'http' && result && 'statusCode' in result) {
          const httpResult = result as HttpCheckResult;
          response.statusCode = httpResult.statusCode;
          response.headers = httpResult.headers;
          response.timing = httpResult.timing;
          response.bodySizeBytes = httpResult.bodySizeBytes;
          response.validationErrors = httpResult.validationErrors;
        }
        
        // Add validation errors for TCP if any
        if (monitorType === 'tcp' && result && 'validationErrors' in result) {
          const tcpResult = result as TcpCheckResult;
          response.validationErrors = tcpResult.validationErrors;
        }
        
        logger.info(
          { 
            jobId, 
            monitorId, 
            status: result.status, 
            responseTimeMs: result.responseTimeMs 
          }, 
          'Monitor check completed'
        );
        
        return response;
        
      } catch (error) {
        logger.error({ error, jobId, monitorId }, 'Monitor check failed with unexpected error');
        
        return {
          jobId,
          region: CONFIG.REGION,
          status: 'failure',
          responseTimeMs: 0,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            type: 'internal_error',
          },
        } as ExecuteResponse;
      }
    }
  );

  return fastify;
}