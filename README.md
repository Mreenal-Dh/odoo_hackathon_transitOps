# TransitOps

TransitOps is a fleet operations dashboard for managing vehicles, drivers, trips, maintenance, expenses, and reporting. It includes role-based authentication, live dashboard metrics, license-expiry alerts, and a Prisma-backed SQLite database.

## Features

- Authentication with JWT-based login and registration
- Fleet dashboard with utilization and activity metrics
- Vehicle registry with status, region, and maintenance history
- Driver directory with license tracking and safety scores
- Trip dispatch, maintenance, expenses, and reports views
- Light/dark theme toggle in the main app shell

## Tech Stack

- React 19 + Vite
- Express + TypeScript server
- Prisma ORM with SQLite
- React Query for client-side data fetching

## Setup

**Prerequisites:** Node.js 18 or newer

1. Install dependencies:
   `npm install`
2. Create a local environment file from the example:
   `cp .env.example .env.local`
3. Set the following values in `.env.local`:
   - `GEMINI_API_KEY` for Gemini API calls
   - `APP_URL` if you want a local base URL override
   - `JWT_SECRET` if you want to override the default server secret
4. Prepare the database:
   `npx prisma generate`
5. Start the development server:
   `npm run dev`

## Scripts

- `npm run dev` - start the app in development mode
- `npm run build` - build the client and server for production
- `npm run start` - run the production server from `dist/server.cjs`
- `npm run lint` - type-check the TypeScript project
- `npm run clean` - remove generated build output

## Database

The app uses a SQLite database configured in `prisma/schema.prisma`. On startup, the server seeds base role data automatically if the database has not been initialized yet.

## Project Structure

- `src/components/` - UI views for dashboard, vehicles, drivers, trips, maintenance, expenses, and reports
- `src/lib/api.ts` - client API helpers and token storage
- `src/db/seed.ts` - initial database seed logic
- `server.ts` - Express API and Vite development server

## Notes

- The app reads `JWT_SECRET` from the environment and falls back to a built-in default for local development.
- The Gemini API key is only required for features that call the Gemini API.
