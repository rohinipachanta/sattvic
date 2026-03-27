// ─────────────────────────────────────────────
// Server-side Supabase clients
// Use these in API routes and Server Components ONLY
// ─────────────────────────────────────────────
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Server client (reads cookies for session) ──
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
export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SRK, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
