// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const { rateLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

// Route modules
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const walletsRoutes = require('./modules/wallets/wallets.routes');
const transactionsRoutes = require('./modules/transactions/transactions.routes');

const app = express();

// ─── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.env === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// ─── General Middleware ────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── HTTP Logging ──────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Rate Limiting ─────────────────────────────────────────
app.use('/api', rateLimiter);

// ─── API Docs ──────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'PayFlow API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ─── Health & Metrics ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

app.get('/metrics', (req, res) => {
  const used = process.memoryUsage();
  res.json({
    memory: {
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    },
    uptime: `${Math.round(process.uptime())}s`,
    pid: process.pid,
    nodeVersion: process.version,
  });
});

// ─── API Routes ────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/wallets', walletsRoutes);
app.use('/api/v1/transactions', transactionsRoutes);

// ─── 404 Handler ───────────────────────────────────────────
app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
});

// ─── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

module.exports = app;
