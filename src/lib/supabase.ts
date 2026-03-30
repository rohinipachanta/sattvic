// ─────────────────────────────────────────────
// Supabase client — two versions:
//   1. Browser client  (for React components)
//   2. Server client   (for API routes / Server Components)
// ─────────────────────────────────────────────
// Think of Supabase like a waiter at a restaurant.
// The browser client is the waiter at your table.
// The server client is the head waiter in the kitchen
// who has a master key to everything.

import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Browser client (use in React client components) ──
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}

// ── Server client (use in API routes and Server Components) ──
export async function createServerClientFromCookies() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll()          { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from Server Component — cookie updates handled by middleware
        }
      },
    },
  })
}

// ── Admin client (bypasses RLS — server-side only) ──
// Use this ONLY in API routes where you need to write as admin
export function createAdminClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_SRK)
}
