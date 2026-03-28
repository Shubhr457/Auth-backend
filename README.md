# Authentication Backend

A production-ready Node.js REST API for user authentication built from scratch.

## Features

- **Email/Password Registration** with email verification required before login
- **JWT-based Authentication**
  - Short-lived Access Tokens (15 min) returned in the response body
  - Long-lived Refresh Tokens (7 days) stored as `HttpOnly` cookies with automatic rotation
- **Password Reset Flow** via email (1-hour expiry)
- **Profile Management** — update name or email; changing email triggers re-verification
- **Security Best Practices**
  - Passwords hashed via `bcryptjs` (cost factor 12)
  - Refresh tokens SHA-256 hashed before storage — raw tokens never persisted
  - Strict rate limiting: 10 req / 15 min on auth endpoints, 100 req / 15 min globally
  - `HttpOnly; Secure; SameSite=Strict` cookie for refresh token (XSS-safe)
  - Helmet security headers
  - NoSQL injection sanitization via `express-mongo-sanitize`
  - CORS configured with `credentials: true`
  - JWT invalidation on password change via `passwordChangedAt` check
  - TTL index on Token collection — expired tokens auto-purged by MongoDB

## Tech Stack

- **Runtime**: Node.js + Express 5
- **Database**: MongoDB + Mongoose
- **Auth**: JSON Web Tokens (`jsonwebtoken`)
- **Validation**: Joi
- **Email**: Nodemailer
- **Logging**: Pino + pino-http

## Project Structure

```
src/
├── config/
│   ├── db.js           - MongoDB connection
│   └── logger.js       - Pino logger singleton
├── helpers/
│   ├── crypto.js       - Secure token generation & SHA-256 hashing
│   ├── email.js        - Nodemailer transporter & email templates
│   └── jwt.js          - Access / refresh token sign & verify
├── middlewares/
│   ├── auth.js         - Bearer token guard + role restriction
│   ├── rateLimiter.js  - Auth & general rate limiters
│   └── validateDto.js  - Joi schema validation middleware
├── models/
│   ├── Token.js        - Mongoose Token schema (refresh / email / reset)
│   └── User.js         - Mongoose User schema
└── modules/
    └── auth/
        ├── controllers/  - One file per endpoint handler
        ├── dto/          - Joi schema definitions
        ├── routes/       - Route definitions & middleware wiring
        └── services/
            ├── auth.service.js   - User-related business logic
            └── token.service.js  - Token lifecycle management
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Required environment variables:

   | Variable | Description | Example |
   |---|---|---|
   | `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/auth` |
   | `JWT_ACCESS_SECRET` | Secret for signing access tokens | random 64-char string |
   | `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | different random 64-char string |
   | `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
   | `CLIENT_URL` | Allowed CORS origin & email link base URL | `http://localhost:3000` |
   | `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
   | `SMTP_PORT` | SMTP server port | `587` |
   | `SMTP_USER` | SMTP username / email address | `you@gmail.com` |
   | `SMTP_PASS` | SMTP password or app password | — |
   | `NODE_ENV` | `development` or `production` | `development` |
   | `PORT` | HTTP port | `5000` |

### Running the Server

```bash
# Development (nodemon + pretty logs)
npm run dev

# Production
npm start
```

## API Reference

All endpoints are prefixed with `/api/v1/auth`.

### Public Endpoints

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | `{ name, email, password }` | Register a new account. Sends a verification email. |
| `POST` | `/verify-email` | `{ token }` | Verify email address using the token from the email. |
| `POST` | `/login` | `{ email, password }` | Authenticate. Returns `accessToken` + sets `refreshToken` cookie. |
| `POST` | `/refresh-token` | — | Rotate the refresh token cookie and issue a new `accessToken`. |
| `POST` | `/forgot-password` | `{ email }` | Send a password reset email (always returns `200` to prevent enumeration). |
| `POST` | `/reset-password` | `{ token, newPassword }` | Reset password; invalidates all sessions. |

### Protected Endpoints

All protected endpoints require `Authorization: Bearer <accessToken>` header.

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/logout` | — | Revoke the refresh token cookie and clear it. |
| `GET` | `/me` | — | Return the authenticated user's profile. |
| `PATCH` | `/me` | `{ name?, email? }` | Update name and/or email. Changing email triggers re-verification. |
| `PATCH` | `/change-password` | `{ currentPassword, newPassword }` | Change password; revokes all refresh tokens. |

### Refresh Token Cookie

The refresh token is stored in an `HttpOnly` cookie named `refreshToken`. This means:

- It is **never accessible to JavaScript** — protected against XSS.
- It is sent **automatically** by the browser on requests to `/refresh-token` and `/logout`.
- Non-browser clients (mobile, CLI) must manage the `Set-Cookie` header manually.

Cookie attributes:

| Attribute | Value |
|---|---|
| `HttpOnly` | `true` |
| `Secure` | `true` in production |
| `SameSite` | `Strict` |
| `Max-Age` | 7 days |

### Example Login Flow

**Request:**
```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "Secret1234" }
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "...",
      "name": "Jane Doe",
      "email": "user@example.com",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

The response also sets a `Set-Cookie: refreshToken=...; HttpOnly; ...` header.

## License

ISC