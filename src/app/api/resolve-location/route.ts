// ─────────────────────────────────────────────
// API Route: GET /api/resolve-location?zip=XXX&country=in
// ─────────────────────────────────────────────
// Used by the wizard Step 4 to show a live location preview
// as the user types their zip code.

import { NextRequest, NextResponse } from 'next/server'
import { resolveZipToLocation } from '@/domain/lunar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const zip     = searchParams.get('zip')
  const country = searchParams.get('country') ?? 'us'

  if (!zip || zip.length < 3) {
    return NextResponse.json({ location: null })
  }

  const location = await resolveZipToLocation(zip, country)

  if (!location) {
    return NextResponse.json({ location: null, error: 'Could not resolve this zip code.' })
  }

  // Spread location fields to top level so frontend can read json.city directly
  return NextResponse.json({ ...location, location })
}
