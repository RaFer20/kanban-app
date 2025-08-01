# Kanban Frontend Service

A modern React + TypeScript frontend for the Kanban board application.

## Features

- Responsive UI with light/dark mode (shadcn/ui)
- Authentication with JWT (login, register, protected routes)
- Board, column, and task management (CRUD)
- Drag-and-drop for columns and tasks (dnd-kit)
- API integration with Auth and Board services
- Form validation with React Hook Form + Zod

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **shadcn/ui** (styling)
- **React Router** (routing)
- **React Hook Form** + **Zod** (forms & validation)
- **dnd-kit** (drag and drop)

## Project Structure

```
src/
  components/      # UI components (modals, forms, board UI, etc)
  hooks/           # Custom React hooks
  lib/             # API client, utilities
  pages/           # Route-level components
  types/           # TypeScript types
  App.tsx          # Main app entry
  main.tsx         # Vite entrypoint
```

## API Integration

Connects to:
- **Auth Service:** `/api/auth/` (user authentication)
- **Board Service:** `/api/board/` (boards, columns, tasks)

API client is in [`src/lib/api.ts`](src/lib/api.ts).

## Environment Variables

Create a `.env.local` file in this directory:

```bash
VITE_API_URL=http://localhost  # API base URL (proxied via nginx or Docker)
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev
```

If using Docker Compose for local dev:

```bash
docker compose -f ../../docker-compose.yml -f ../../docker-compose.dev.yml up frontend
```

## Production Build

```bash
npm run build
```

The output will be in `dist/`. For Docker, use the production `Dockerfile` and update your compose config as needed.



## Notes

- Make sure the backend Auth and Board services are running and accessible at the URLs configured in `VITE_API_URL`.
- For local development, API requests may be proxied via Nginx or Docker Compose networking.

---
