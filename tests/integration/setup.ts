const env = process.env as Record<string, string | undefined>;

env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/opencode_crm_test";
env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";
env.AUTH_URL = "http://localhost:3000";
env.NODE_ENV = "test";
