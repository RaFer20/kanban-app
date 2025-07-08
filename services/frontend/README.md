# Kanban Frontend Service

A modern React + TypeScript frontend for the Kanban board application.

## Features

- Responsive UI with light/dark mode
- Authentication with JWT (login, protected routes)
- Board, column, and task management
- API integration with Auth and Board services

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui** (styling)
- **React Router** (routing)
- **React Hook Form** + **Zod** (forms & validation)

## API Integration

Connects to:
- **Auth Service:** `/api/auth/` (user authentication)
- **Board Service:** `/api/board/` (boards, columns, tasks)

API client is in `src/lib/api.ts`.

## Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost  # API base URL (proxied via nginx)
```
