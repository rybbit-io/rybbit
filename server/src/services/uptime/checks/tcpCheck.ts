import net from 'net';
import { performance } from 'perf_hooks';
import { TcpCheckResult } from '../types.js';

interface TcpCheckOptions {
  host: string;
  port: number;
  timeoutMs?: number;
}

export async function performTcpCheck(options: TcpCheckOptions): Promise<TcpCheckResult> {
  const startTime = performance.now();
  
  return new Promise<TcpCheckResult>((resolve) => {
    const socket = new net.Socket();
    const timeout = options.timeoutMs || 30000;
    
    // Set timeout
    socket.setTimeout(timeout);
    
    // Handle successful connection
    socket.on('connect', () => {
      const responseTimeMs = Math.round(performance.now() - startTime);
      socket.destroy();
      
      resolve({
        status: 'success',
        responseTimeMs,
        validationErrors: [],
      });
    });
    
    // Handle errors
    socket.on('error', (error: any) => {
      const responseTimeMs = Math.round(performance.now() - startTime);
      socket.destroy();
      
      let errorType = 'connection_error';
      let errorMessage = error.message || 'Connection failed';
      
      if (error.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
        errorMessage = `Connection refused to ${options.host}:${options.port}`;
      } else if (error.code === 'ENOTFOUND') {
        errorType = 'dns_failure';
        errorMessage = `Host ${options.host} not found`;
      } else if (error.code === 'ETIMEDOUT') {
        errorType = 'connection_timeout';
        errorMessage = 'Connection timed out';
      } else if (error.code === 'EHOSTUNREACH') {
        errorType = 'host_unreachable';
        errorMessage = `Host ${options.host} is unreachable`;
      }
      
      resolve({
        status: errorType === 'connection_timeout' ? 'timeout' : 'failure',
        responseTimeMs,
        validationErrors: [],
        error: {
          message: errorMessage,
          type: errorType,
        },
      });
    });
    
    // Handle timeout
    socket.on('timeout', () => {
      const responseTimeMs = Math.round(performance.now() - startTime);
      socket.destroy();
      
      resolve({
        status: 'timeout',
        responseTimeMs,
        validationErrors: [],
        error: {
          message: `Connection timeout after ${timeout}ms`,
          type: 'connection_timeout',
        },
      });
    });
    
    // Attempt connection
    try {
      socket.connect(options.port, options.host);
    } catch (error: any) {
      const responseTimeMs = Math.round(performance.now() - startTime);
      
      resolve({
        status: 'failure',
        responseTimeMs,
        validationErrors: [],
        error: {
          message: error.message || 'Failed to initiate connection',
          type: 'connection_error',
        },
      });
    }
  });
}