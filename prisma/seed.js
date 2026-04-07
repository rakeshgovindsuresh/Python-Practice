// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@payflow.dev' },
    update: {},
    create: {
      email: 'alice@payflow.dev',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Johnson',
      kycStatus: 'VERIFIED',
      wallets: {
        create: [
          { currency: 'USD', balance: 5000.00 },
          { currency: 'EUR', balance: 2000.00 },
        ],
      },
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@payflow.dev' },
    update: {},
    create: {
      email: 'bob@payflow.dev',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Smith',
      kycStatus: 'VERIFIED',
      wallets: {
        create: [
          { currency: 'USD', balance: 1000.00 },
        ],
      },
    },
  });

  console.log('✅ Seeded users:', { alice: alice.email, bob: bob.email });
  console.log('🔑 Test credentials: any seeded email + Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
