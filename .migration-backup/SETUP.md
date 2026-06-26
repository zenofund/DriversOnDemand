# Setup Instructions

## Required Environment Variables

You need to add the following secret to Replit Secrets:

### SUPABASE_SERVICE_ROLE_KEY

This is different from the `VITE_SUPABASE_ANON_KEY` and provides full database access for the backend API.

**How to get it:**

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Find the **service_role** key in the **Project API keys** section
4. Copy the `service_role secret` key (NOT the anon/public key)
5. Add it to Replit Secrets as `SUPABASE_SERVICE_ROLE_KEY`

**Security Note:** The service role key bypasses Row Level Security (RLS), so it should NEVER be exposed to the frontend. It's only used in the backend API (server/routes.ts).

## All Required Secrets

Make sure these are all set in Replit Secrets:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public/anon key (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only) ⚠️
- `VITE_PAYSTACK_PUBLIC_KEY` - Paystack public key
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key

## Database Setup

1. Run the SQL in `supabase_schema.sql` in your Supabase SQL Editor
2. This will create all tables, indexes, RLS policies, and triggers
3. The database will be ready for the application to use

## Testing the Setup

Once all secrets are configured:

1. Restart the workflow
2. Visit the landing page at `/`
3. Try signing up as a driver or client
4. The backend API should now work correctly
