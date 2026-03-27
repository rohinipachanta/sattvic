'use client'
// ─────────────────────────────────────────────
// Login Page — Landing screen with Google Sign-In
// ─────────────────────────────────────────────

import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center
                     bg-gradient-to-br from-[#FDF0E0] via-[#FBE9D3] to-[#F5E0E0]
                     px-6 py-10">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="text-6xl mb-3">🪔</div>
        <h1 className="text-5xl font-extrabold text-saffron tracking-tight mb-2">
          Sattvic
        </h1>
        <p className="text-mid text-lg mb-10 leading-relaxed">
          Nourish your family.<br />Honour your roots.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            '🌿 Ayurvedic Doshas',
            '🌙 Lunar Fasting',
            '🩺 Health Conditions',
            '💪 Protein Targets',
            '🍱 Indian Cuisines',
            '📊 Nutrition Facts',
          ].map(pill => (
            <span key={pill}
              className="bg-saffron/10 text-saffron px-3 py-1.5
                         rounded-pill text-sm font-semibold">
              {pill}
            </span>
          ))}
        </div>

        {/* Google Sign-In */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3
                     bg-white text-[#3c4043] font-medium text-base
                     border border-[#dadce0] rounded-pill px-7 py-4
                     hover:shadow-md transition-shadow duration-200"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-light text-sm mt-8 leading-relaxed">
          Built for Indian Hindu families everywhere.<br />
          Ekadashi, Navratri, doshas &amp; all.
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
