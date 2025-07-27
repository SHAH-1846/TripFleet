const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');

const config = require('./config');
const logger = require('./utils/logger');
const database = require('./database/connection');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const cronJobs = require('./jobs/cronJobs');

class Application {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    try {
      await this.setupDatabase();
      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();
      this.setupCronJobs();
      
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      process.exit(1);
    }
  }

  async setupDatabase() {
    await database.connect();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression
    this.app.use(compression());

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests, please try again later',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: config.upload.maxFileSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.upload.maxFileSize }));

    // Session configuration
    this.app.use(session({
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.env === 'production',
        httpOnly: true,
        maxAge: config.session.maxAge,
      },
    }));

    // Passport initialization
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Static files
    this.app.use('/uploads', express.static('uploads'));
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Service is healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    this.app.use('/api/v1', routes);
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  setupCronJobs() {
    cronJobs.initialize();
  }

  async start() {
    const port = config.port;
    
    this.server = this.app.listen(port, () => {
      logger.info(`Server running on port ${port} in ${config.env} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async shutdown() {
    logger.info('Shutting down server...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    await database.disconnect();
    process.exit(0);
  }
}

// Initialize and start application
const app = new Application();

(async () => {
  await app.initialize();
  await app.start();
})();

module.exports = app;