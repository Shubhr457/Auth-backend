# Authentication Backend

A production-ready Node.js REST API for user authentication built from scratch.

## Features

- **Email/Password Registration**
- **Email Verification** required before login
- **JWT-based Authentication**
  - Short-lived Access Tokens (15 min)
  - Long-lived Opaque Refresh Tokens (7 days) with DB rotation
- **Password Reset Flow** via email
- **Profile Management** (update name, email, password)
- **Security Best Practices**
  - Password hashing via `bcryptjs`
  - Strict Rate Limiting (10 req/15min on auth endpoints)
  - Helmet for security headers
  - CORS properly configured

## Tech Stack

- Node.js & Express
- MongoDB & Mongoose
- JSON Web Tokens (JWT)
- Nodemailer
- express-validator

## Project Structure

- `src/config/` - Database connection
- `src/controllers/` - Route handlers for authentication
- `src/middlewares/` - Auth protection, rate limiting, and input validation
- `src/models/` - Mongoose schemas (`User` and `Token`)
- `src/routes/` - Express routers
- `src/utils/` - Helpers for JWT, Crypto, and Emails
- `tests/` - Jest test suite using an in-memory MongoDB

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB server (local or Atlas)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env` variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Random secure strings
   - `SMTP_*`: Your email provider credentials (e.g., Gmail App Password, SendGrid)

### Running the Server

- **Development Mode:**
  ```bash
  npm run dev
  ```
- **Production Mode:**
  ```bash
  npm start
  ```

### Running Tests

The test suite uses `mongodb-memory-server` so you do not need a running MongoDB instance to run the tests.

```bash
npm test
```

## API Documentation

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register a new user account |
| POST | `/api/v1/auth/verify-email` | Verify email address (requires `token`) |
| POST | `/api/v1/auth/login` | Authenticate user & get tokens |
| POST | `/api/v1/auth/refresh-token` | Issue new access token using an active `refreshToken` |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password (requires `token` & `newPassword`) |

### Protected Endpoints (Requires `Bearer` Access Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/logout` | Revoke the provided `refreshToken` |
| GET | `/api/v1/auth/me` | Get the authenticated user's profile |
| PATCH | `/api/v1/auth/me` | Update the user's name or email |
| PATCH | `/api/v1/auth/change-password` | Update password (requires `currentPassword`) |

## License

ISC
