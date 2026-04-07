# PayFlow API 💸

> A production-grade FinTech REST API — multi-currency wallets, idempotent transfers, async queue processing, and JWT token rotation.

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-brightgreen)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-orange)](https://docs.bullmq.io)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-purple)](https://prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Client                            │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────┐
│              Express App  (src/app.js)                  │
│  Helmet · CORS · Rate Limiter · Morgan · Compression    │
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                    Route Modules                        │
│  /auth    /users    /wallets    /transactions           │
└──────┬──────────────────────────────────────────────────┘
       │ Middleware chain
       │  → validate (Zod) → authenticate (JWT)
┌──────▼──────────────────────────────────────────────────┐
│                  Service Layer                          │
│  Business logic · Idempotency · Prisma transactions    │
└──────┬──────────────────────┬──────────────────────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────────────────────┐
│  PostgreSQL │    │        Redis + BullMQ               │
│  (Prisma)   │    │   Transaction Queue · Workers       │
└─────────────┘    └─────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Layered architecture** | Separates concerns cleanly — routes → controllers → services → repository |
| **Idempotency keys** | Prevents double-charging on retries, mirrors Stripe's API design |
| **Async queue (BullMQ)** | Decouples transfer initiation from processing; survives crashes, supports retries |
| **Prisma `$transaction()`** | Atomic debit/credit prevents race conditions and partial updates |
| **Refresh token rotation** | Each refresh issues a new token pair and revokes the old one — limits token theft blast radius |
| **Zod validation** | Schema-first validation with typed, parsed request bodies |

---

## ✨ Features

- 🔐 **JWT Auth** — Access tokens (15m) + Refresh token rotation (7d) with Redis-backed revocation
- 💳 **Multi-currency Wallets** — USD, EUR, GBP, NGN with per-user, per-currency uniqueness
- 💸 **Idempotent Transfers** — `Idempotency-Key` header prevents duplicate transactions on retries
- ⚡ **Async Processing** — BullMQ workers with 3-attempt exponential backoff
- 🛡️ **Security** — Helmet, CORS, rate limiting (global + auth-specific), input sanitization
- 📄 **Swagger UI** — Auto-generated interactive API docs at `/api-docs`
- 📊 **Observability** — Structured Winston logging, slow query detection, `/health` + `/metrics`
- 🐳 **Docker-ready** — Full `docker-compose` with Postgres, Redis, and the app
- 🧪 **Tested** — Unit tests (mocked) + integration tests (Supertest)

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/)

### Option A — Docker (recommended, zero config)

```bash
git clone https://github.com/YOUR_USERNAME/payflow-api.git
cd payflow-api

# Copy env (defaults work out of the box with Docker)
cp .env.example .env

# Start everything: Postgres + Redis + App
docker compose up -d

# Run migrations + seed
docker compose exec app npx prisma migrate deploy
docker compose exec app node prisma/seed.js
```

API is live at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api-docs`

---

### Option B — Local Development

```bash
git clone https://github.com/YOUR_USERNAME/payflow-api.git
cd payflow-api

# 1. Install dependencies
npm install

# 2. Start Postgres + Redis via Docker (just the infra)
docker compose up -d postgres redis

# 3. Copy and configure env
cp .env.example .env

# 4. Run DB migrations and generate Prisma client
npm run db:migrate
npm run db:generate

# 5. Seed test data
npm run db:seed

# 6. Start dev server (hot reload)
npm run dev
```

---

## 🔑 Test Credentials (after seeding)

| Email | Password | Wallets |
|---|---|---|
| `alice@payflow.dev` | `Password123!` | USD ($5,000), EUR (€2,000) |
| `bob@payflow.dev` | `Password123!` | USD ($1,000) |

---

## 📡 API Reference

Interactive docs: **`http://localhost:3000/api-docs`**

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user | Public |
| `POST` | `/api/v1/auth/login` | Login, receive token pair | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token | Public |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token | Bearer |

### Wallets

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/wallets` | Create a new currency wallet |
| `GET` | `/api/v1/wallets` | List all wallets for current user |
| `GET` | `/api/v1/wallets/:id` | Get wallet details |
| `POST` | `/api/v1/wallets/:id/fund` | Simulate a deposit |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/transactions/transfer` | Initiate transfer (requires `Idempotency-Key` header) |
| `GET` | `/api/v1/transactions/history` | Paginated & filterable history |
| `GET` | `/api/v1/transactions/:id` | Get single transaction |

### System

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness check |
| `GET /metrics` | Memory usage, uptime, PID |
| `GET /api-docs` | Swagger UI |

---

## 💡 Example: Idempotent Transfer

```bash
# Step 1 — Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@payflow.dev","password":"Password123!"}' \
  | jq -r '.data.accessToken')

# Step 2 — Get your wallet ID
WALLET=$(curl -s http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.wallets[0].id')

# Step 3 — Transfer (safe to retry with same key)
curl -X POST http://localhost:3000/api/v1/transactions/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"senderWalletId\":\"$WALLET\",\"receiverWalletId\":\"BOB_WALLET_ID\",\"amount\":50}"
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# With coverage report
npm run test:coverage
```

Test structure:
- `tests/unit/` — Service layer tests with mocked Prisma
- `tests/integration/` — Route-level tests with Supertest

---

## 📁 Project Structure

```
payflow-api/
├── src/
│   ├── config/           # env, database, redis, logger, swagger
│   ├── middlewares/      # authenticate, validate, errorHandler, rateLimiter
│   ├── modules/
│   │   ├── auth/         # register · login · refresh · logout
│   │   ├── users/        # profile management
│   │   ├── wallets/      # create · fund · balance
│   │   └── transactions/ # transfer · history (idempotent + queued)
│   ├── queues/           # BullMQ queue + worker
│   ├── utils/            # AppError · asyncWrapper · pagination · response
│   ├── app.js            # Express setup
│   └── server.js         # Entry point + graceful shutdown
├── prisma/
│   ├── schema.prisma     # DB schema
│   └── seed.js           # Test data
├── tests/
│   ├── unit/             # Service tests (mocked)
│   └── integration/      # Route tests (Supertest)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 4 |
| Database | PostgreSQL 16 + Prisma ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Docs | Swagger UI (swagger-jsdoc) |
| Logging | Winston + Morgan |
| Testing | Jest + Supertest |
| Container | Docker + docker-compose |

---

## 📜 License

MIT © 2024
