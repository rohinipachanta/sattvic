// ─────────────────────────────────────────────
// Auth Callback — handles Google OAuth redirect
// ─────────────────────────────────────────────
// After Google login, Google redirects back here.
// We exchange the auth code for a session,
// then check if the user has completed setup.
// New users → /setup | Returning users → /home

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookieStore.set(name, value, options as any)
          )
        },
      },
    }
  )

  // Exchange code for session
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${appUrl}/login?error=auth_failed`)
  }

  // Upsert user row (first login creates it, subsequent logins update email)
  await supabase.from('users').upsert({
    id:        user.id,
    email:     user.email!,
    google_id: user.user_metadata?.sub ?? user.id,
  }, { onConflict: 'id' })

  // Check if user has completed setup (has at least one family member)
  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isNewUser = !count || count === 0

  return NextResponse.redirect(`${appUrl}/${isNewUser ? 'setup' : 'home'}`)
}
