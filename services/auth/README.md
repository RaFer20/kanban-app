# Kanban Auth Service

This service handles authentication and user management for the Kanban board app.  
It issues and verifies JWT access/refresh tokens and manages user registration, login, and logout.

---

## Features

- User registration and login
- JWT access and refresh token issuance
- Token refresh and revocation (logout)
- Role support (admin, user, etc.)
- Secure password hashing (bcrypt)
- Observability endpoints (`/metrics`, `/health`)
- Built with FastAPI, SQLAlchemy, Alembic, PostgreSQL

---

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- Or: Python 3.11+, Poetry

### Running with Docker

```bash
docker compose up --build auth auth-db
```

### Running Locally

```bash
cd services/auth
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

### Environment Variables

See `.env` for required variables (e.g., `DATABASE_URL`, `SECRET_KEY`, etc.).

---

## API Endpoints

- **POST `/api/v1/users/`** — Register a new user
- **POST `/api/v1/token`** — Login and get access/refresh tokens
- **POST `/api/v1/refresh`** — Refresh tokens
- **POST `/api/v1/logout`** — Logout (revoke refresh tokens)
- **GET `/api/v1/me`** — Get current user info
- **GET `/api/v1/health`** — Health check
- **GET `/metrics`** — Prometheus metrics

See [Swagger UI](http://localhost:8000/docs) for full API docs.

---

## Token Details

- **Access Token:** Short-lived JWT, used for API authentication.
- **Refresh Token:** Long-lived, single-use, stored in DB, used to get new access tokens.
- **Token Rotation:** Refresh tokens are rotated and revoked on use.
- **Logout:** Revokes all refresh tokens for the user.

---

## Error Codes

| Status | Meaning                        |
|--------|--------------------------------|
| 400    | Validation error               |
| 401    | Unauthorized/invalid token     |
| 409    | Duplicate email                |
| 500    | Internal server error          |

---

## Testing

```bash
docker compose exec auth pytest
# or
poetry run pytest
```

---

## Tech Stack

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- Passlib (bcrypt)
- jose (JWT)
- Poetry
- Docker

---
