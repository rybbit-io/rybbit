import { CONFIG, validateConfig } from './config.js';
import { logger } from './utils/logger.js';
import { createServer } from './api/server.js';

async function start() {
  try {
    // Validate configuration
    validateConfig();
    
    logger.info(
      { 
        region: CONFIG.REGION,
        port: CONFIG.PORT,
      }, 
      'Starting monitor agent'
    );
    
    // Create and start server
    const server = await createServer();
    
    await server.listen({
      port: CONFIG.PORT,
      host: CONFIG.HOST,
    });
    
    logger.info(
      { 
        region: CONFIG.REGION,
        url: `http://${CONFIG.HOST}:${CONFIG.PORT}`,
      }, 
      'Monitor agent started successfully'
    );
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down monitor agent');
      
      try {
        await server.close();
        logger.info('Monitor agent stopped');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.fatal({ error }, 'Failed to start monitor agent');
    process.exit(1);
  }
}

// Start the application
start();