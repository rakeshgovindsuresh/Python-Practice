// src/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PayFlow API',
      version: '1.0.0',
      description: `
## PayFlow — Multi-Wallet Payment & Transaction Platform

A production-grade FinTech REST API featuring:
- 🔐 JWT Authentication with Refresh Token Rotation
- 💳 Multi-currency Wallet Management  
- 💸 Idempotent Transaction Processing
- ⚡ Async Queue-based Transaction Workers
- 🛡️ Rate Limiting, Helmet, CORS security

### Authentication
Use the \`/api/v1/auth/login\` endpoint to get an access token, then click **Authorize** and paste it as \`Bearer <token>\`.
      `,
      contact: {
        name: 'PayFlow API',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'PENDING_KYC'] },
            kycStatus: { type: 'string', enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'NGN'] },
            balance: { type: 'string', example: '1000.00' },
            status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            idempotencyKey: { type: 'string' },
            senderWalletId: { type: 'string', format: 'uuid', nullable: true },
            receiverWalletId: { type: 'string', format: 'uuid', nullable: true },
            amount: { type: 'string', example: '100.00' },
            currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'NGN'] },
            type: { type: 'string', enum: ['CREDIT', 'DEBIT', 'TRANSFER'] },
            status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'] },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.js'],
};

module.exports = swaggerJsdoc(options);
