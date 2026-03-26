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

This project follows a **modular monolithic architecture** where features are organized into self-contained modules:

```
src/
├── config/         - Database configuration
├── helpers/        - Shared utilities (JWT, crypto, email)
├── interfaces/     - Shared type definitions and constants
├── middlewares/    - Auth protection, rate limiting, validation
├── models/         - Mongoose schemas (User, Token)
└── modules/
    └── auth/       - Authentication module
        ├── controllers/  - Individual endpoint handlers
        ├── routes/       - Route definitions
        ├── services/     - Business logic layer
        └── validators/   - Input validation rules
```

**Benefits of this architecture:**
- **Modularity**: Each feature is self-contained and easy to maintain
- **Scalability**: New modules can be added independently
- **Separation of Concerns**: Controllers, services, and validators are clearly separated
- **Testability**: Services can be tested independently of HTTP layer

`tests/` - Comprehensive Jest test suite using in-memory MongoDB

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
