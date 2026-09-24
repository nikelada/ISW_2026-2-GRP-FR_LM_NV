# Lumina Auth App

A full-stack login web app with two independent projects: a vanilla HTML/JavaScript frontend powered by Vite and an Express JavaScript backend managed with nodemon.

## Requirements

- Node.js 18+
- npm

## Run locally

The frontend and backend are separate projects, but they work together through the `/api` route. Vite forwards frontend API requests to the Express backend.

To start both together from the project root:

```bash
npm install
npm run install:all
npm run dev
```

Open http://localhost:5173.

You can also run them separately in two terminals.

### Backend

```bash
cd backend
npm install
npm run dev
```

The API runs at http://localhost:3000.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

The API runs at http://localhost:3000. The default demo account is:

- Email: `demo@lumina.app`
- Password: `demo1234`

## Project structure

- `frontend/` contains the Vite app, HTML entry point, JavaScript, and CSS.
- `backend/` contains the Express API, authentication logic, and nodemon script.
- `frontend/.env.example` configures the API URL.
- `backend/.env.example` configures the port and JWT secret.

The frontend and backend remain independently installable, while the root scripts coordinate them for normal development.

## PostgreSQL configuration

1. Create a PostgreSQL database named `lumina_auth`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set your PostgreSQL password in `backend/.env`.
4. Run `npm run dev` from the project root.

The backend creates the `users` table and seeds these accounts on first startup:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lumina.app` | `admin2026` |
| Manager | `manager@lumina.app` | `manager2026` |
| Usuario | `usuario@lumina.app` | `usuario2026` |

## Notes

Users are stored in PostgreSQL. `synchronize: true` is useful for local development only; use migrations before production. Set a strong `JWT_SECRET`, serve over HTTPS, and move tokens to secure httpOnly cookies before deployment.
