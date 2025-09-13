import net from 'net';
import { performance } from 'perf_hooks';
import { MonitorConfig, TcpCheckResult } from '../types.js';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

export async function performTcpCheck(config: MonitorConfig): Promise<TcpCheckResult> {
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    if (!config.host || !config.port) {
      resolve({
        status: 'failure',
        responseTimeMs: 0,
        error: {
          message: 'Host and port are required for TCP monitoring',
          type: 'configuration_error',
        },
      });
      return;
    }
    
    const timeout = Math.min(config.timeoutMs || CONFIG.DEFAULT_TIMEOUT_MS, CONFIG.MAX_TIMEOUT_MS);
    const socket = new net.Socket();
    
    // Set timeout
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      const responseTimeMs = Math.round(performance.now() - startTime);
      
      logger.warn({ host: config.host, port: config.port, responseTimeMs }, 'TCP connection timeout');
      
      resolve({
        status: 'timeout',
        responseTimeMs,
        error: {
          message: 'Connection timeout',
          type: 'timeout',
        },
      });
    }, timeout);
    
    // Handle connection success
    socket.on('connect', () => {
      clearTimeout(timeoutHandle);
      const responseTimeMs = Math.round(performance.now() - startTime);
      
      logger.info({ host: config.host, port: config.port, responseTimeMs }, 'TCP connection successful');
      
      socket.destroy();
      resolve({
        status: 'success',
        responseTimeMs,
      });
    });
    
    // Handle errors
    socket.on('error', (error: any) => {
      clearTimeout(timeoutHandle);
      const responseTimeMs = Math.round(performance.now() - startTime);
      
      let errorType = 'connection_error';
      let errorMessage = error.message;
      
      if (error.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
        errorMessage = 'Connection refused';
      } else if (error.code === 'EHOSTUNREACH') {
        errorType = 'host_unreachable';
        errorMessage = 'Host unreachable';
      } else if (error.code === 'ENOTFOUND') {
        errorType = 'dns_failure';
        errorMessage = 'Host not found';
      }
      
      logger.error({ error, host: config.host, port: config.port }, 'TCP check failed');
      
      resolve({
        status: 'failure',
        responseTimeMs,
        error: {
          message: errorMessage,
          type: errorType,
        },
      });
    });
    
    // Initiate connection
    socket.connect(config.port, config.host);
  });
}