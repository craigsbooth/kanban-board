import { prisma } from '../lib/prisma';

// Setup test environment
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});