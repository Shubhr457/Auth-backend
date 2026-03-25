// Set env vars for tests (runs before test framework - no beforeAll needed)
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_super_long_string_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_super_long_string_456';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test';
