# Draba

A driver-hire platform for Nigeria — clients book verified drivers on demand, drivers manage bookings and earnings, and admins oversee the platform.

## Run & Operate

- `pnpm --filter @workspace/draba run dev` — run the frontend (port 20344)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v3 + Wouter + Zustand + Supabase Auth
- API: Express 5 + Supabase (data + auth) + Paystack (payments)
- Validation: Zod (`zod/v4`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/draba/` — React frontend (Vite, Tailwind v3, wouter routing)
- `artifacts/api-server/` — Express backend (all `/api/*` routes)
- `artifacts/api-server/src/routes/routes.ts` — all API route handlers (5k+ lines)
- `artifacts/api-server/src/services/` — business logic (payouts, email, NIN, etc.)
- `lib/db/src/schema/schema.ts` — shared Zod schemas and TypeScript types
- `artifacts/draba/vite.config.ts` — `@shared/schema` aliased to the schema file

## Architecture decisions

- **No Drizzle DB** — data lives in Supabase (Postgres via Supabase client). The `lib/db` package holds Zod schemas only; `DATABASE_URL` is not required at runtime.
- **`@shared/schema` alias** — frontend resolves `@shared/schema` via Vite alias directly to `lib/db/src/schema/schema.ts` (pure Zod), bypassing `@workspace/db`'s db-connection code.
- **OpenAPI spec skipped** — routes.ts is 5k+ lines with a complex existing fetch layer; rewriting to generated hooks was out of scope for the port. Frontend uses its own queryClient with Supabase auth headers.
- **registerRoutes pattern** — backend uses the legacy `registerRoutes(app): Promise<Server>` signature; `index.ts` calls it and listens on the returned HTTP server.

## Product

- **Clients** — browse and book verified drivers, track active bookings, in-app chat, NIN verification
- **Drivers** — manage availability, accept bookings, track earnings and history, bank account setup for payouts
- **Admins** — user management, booking oversight, dispute resolution, analytics, NIN verification review

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `VITE_SUPABASE_URL` env vars for the backend and frontend to function.
- Requires `PAYSTACK_SECRET_KEY` and `VITE_PAYSTACK_PUBLIC_KEY` for payment flows.
- Do NOT import `@workspace/db` in frontend code — it triggers a database connection. Use the `@shared/schema` alias instead.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
