# Todos API

Express + TypeORM + SQLite API for the Todos app.

## Stack
- Express
- TypeORM
- SQLite
- TypeScript

## Local setup

Requires Node.js 20 or newer and Yarn Classic (1.x). SQLite is embedded in this
service; no separate database server is needed. Start from this repository:

```bash
yarn install --frozen-lockfile
yarn dev
```

Start the UI separately using its README, then register an account, sign out,
and sign in to create a todo. Stop the API with Ctrl+C. Restart it after source edits.

API runs on `http://localhost:8080`.
Docs: `http://localhost:8080/docs`

## Configuration
Environment variables (see `.env.example`):
- `PORT`: API port (default `8080`)
- `DATABASE_URL`: SQLite database path (default `data.sqlite`)
- `CORS_ORIGIN`: UI origin allowed for cookies (default `http://localhost:3000`)
- `SESSION_TTL_DAYS`: session lifetime in days (default `7`)
- `SESSION_COOKIE_SECURE`: `true` for HTTPS cookies, `false` for HTTP; defaults to true when `NODE_ENV=production`

The API reads the process environment, not `.env` automatically. Defaults work
locally; to override a setting, prefix the command, for example
`PORT=8080 DATABASE_URL=data.sqlite yarn dev`. The SQLite file persists across
restarts. `NODE_ENV` defaults to development when running `yarn dev`.

## Endpoints
- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout` (requires session)
- `GET /api/v1/auth/me` (requires session)
- `GET /api/v1/todos` (requires session)
- `GET /api/v1/todos/:id` (requires session)
- `POST /api/v1/todos` `{ "title": "..." }` (requires session)
- `PATCH /api/v1/todos/:id` `{ "title"?: "...", "status"?: "in_progress" | "backlog" | "completed" }` (requires session)
- `DELETE /api/v1/todos/:id` (requires session)

## Data Model
`Todo`
- `id`: number
- `title`: string
- `status`: `"in_progress" | "backlog" | "completed"`
- `createdAt`: ISO string
- `updatedAt`: ISO string

## Project Layout
- `src/index.ts`: app bootstrap and route wiring
- `src/routes/todos.ts`: todos routes
- `src/entity/Todo.ts`: TypeORM entity
- `src/data-source.ts`: database config

## How To Learn This API
1. Start the server.
2. Register with `POST /api/v1/auth/register`.
3. Make a request to `GET /api/v1/todos` and inspect the response.
4. Create a todo with `POST /api/v1/todos`.
5. Update status using `PATCH /api/v1/todos/:id`.
5. Delete a todo and confirm it’s gone.

## Suggested Exercises
1. Add a `description` column to the entity and expose it in API responses.
2. Add server‑side filtering: `GET /api/v1/todos?status=in_progress`.
3. Add simple validation with a library like `zod` or `yup`.
4. Add pagination with `limit` and `offset`.

## Scripts
- `yarn dev`: build and run the server
- `yarn build`: compile TypeScript
- `yarn start`: run compiled server
- `yarn test`: run API tests
