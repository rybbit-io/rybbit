import { request } from 'undici';
import { performance } from 'perf_hooks';
import dns from 'dns/promises';
import { MonitorConfig, HttpCheckResult, TimingInfo } from '../types.js';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

export async function performHttpCheck(config: MonitorConfig): Promise<HttpCheckResult> {
  const startTime = performance.now();
  const timing: TimingInfo = {};
  
  try {
    if (!config.url) {
      throw new Error('URL is required for HTTP monitoring');
    }
    
    const url = new URL(config.url);
    
    // DNS lookup timing
    const dnsStart = performance.now();
    try {
      const dnsOptions: any = {};
      if (config.ipVersion === 'ipv4') dnsOptions.family = 4;
      if (config.ipVersion === 'ipv6') dnsOptions.family = 6;
      
      await dns.lookup(url.hostname, dnsOptions);
      timing.dnsMs = Math.round(performance.now() - dnsStart);
    } catch (dnsError) {
      logger.error({ error: dnsError, hostname: url.hostname }, 'DNS lookup failed');
      throw new Error(`DNS lookup failed: ${dnsError}`);
    }
    
    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': config.userAgent || 'Rybbit-Monitor/1.0',
      ...config.headers,
    };
    
    // Add authentication
    if (config.auth) {
      switch (config.auth.type) {
        case 'basic':
          if (config.auth.credentials?.username && config.auth.credentials?.password) {
            const basicAuth = Buffer.from(
              `${config.auth.credentials.username}:${config.auth.credentials.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${basicAuth}`;
          }
          break;
        case 'bearer':
          if (config.auth.credentials?.token) {
            headers['Authorization'] = `Bearer ${config.auth.credentials.token}`;
          }
          break;
        case 'api_key':
        case 'custom_header':
          if (config.auth.credentials?.headerName && config.auth.credentials?.headerValue) {
            headers[config.auth.credentials.headerName] = config.auth.credentials.headerValue;
          }
          break;
      }
    }
    
    // Perform request
    const requestStart = performance.now();
    const response = await request(config.url, {
      method: (config.method || 'GET') as any,
      headers,
      body: config.body,
      bodyTimeout: Math.min(config.timeoutMs || CONFIG.DEFAULT_TIMEOUT_MS, CONFIG.MAX_TIMEOUT_MS),
      headersTimeout: Math.min(config.timeoutMs || CONFIG.DEFAULT_TIMEOUT_MS, CONFIG.MAX_TIMEOUT_MS),
      maxRedirections: config.followRedirects !== false ? 5 : 0,
    });
    
    // Calculate timings
    timing.ttfbMs = Math.round(performance.now() - requestStart);
    
    // Get response body and size
    const transferStart = performance.now();
    const bodyBuffer = await response.body.arrayBuffer();
    const bodySizeBytes = bodyBuffer.byteLength;
    
    timing.transferMs = Math.round(performance.now() - transferStart);
    
    // Estimate TCP and TLS times (approximations)
    timing.tcpMs = Math.round((timing.ttfbMs - timing.dnsMs) * 0.3);
    if (url.protocol === 'https:') {
      timing.tlsMs = Math.round((timing.ttfbMs - timing.dnsMs - timing.tcpMs) * 0.5);
    }
    
    const responseTimeMs = Math.round(performance.now() - startTime);
    
    // Convert headers to simple object
    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
      responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    
    return {
      status: 'success',
      statusCode: response.statusCode,
      responseTimeMs,
      timing,
      headers: responseHeaders,
      bodySizeBytes,
      validationErrors: [],
    };
    
  } catch (error: any) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    
    // Handle different error types
    let errorType = 'unknown_error';
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      errorType = 'connection_timeout';
      errorMessage = 'Connection timed out';
    } else if (error.code === 'UND_ERR_HEADERS_TIMEOUT') {
      errorType = 'headers_timeout';
      errorMessage = 'Headers timeout';
    } else if (error.code === 'UND_ERR_BODY_TIMEOUT') {
      errorType = 'body_timeout';
      errorMessage = 'Body timeout';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'dns_failure';
      errorMessage = 'DNS lookup failed';
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'connection_refused';
      errorMessage = 'Connection refused';
    } else if (error.message?.includes('SSL') || error.message?.includes('TLS')) {
      errorType = 'ssl_error';
    }
    
    logger.error({ error, url: config.url }, 'HTTP check failed');
    
    return {
      status: errorType.includes('timeout') ? 'timeout' : 'failure',
      responseTimeMs,
      timing,
      headers: {},
      bodySizeBytes: 0,
      validationErrors: [],
      error: {
        message: errorMessage,
        type: errorType,
      },
    };
  }
}