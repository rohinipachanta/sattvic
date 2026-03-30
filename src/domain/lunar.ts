// ─────────────────────────────────────────────
// Sattvic — Lunar Calendar & Fasting Engine
// ─────────────────────────────────────────────
// Think of the Hindu lunar calendar like a clock
// that runs on the moon rather than the sun.
// Each "tick" is a Tithi (lunar day), and certain
// Tithis are sacred fasting days.
//
// The tricky part: the moon rises and sets at different
// times depending on WHERE you are on Earth.
// That's why we need your zip code — not just your timezone.
//
// This module:
//   1. Resolves zip → lat/long via Zippopotam.us
//   2. Calculates which days in a week are fasting days
//   3. Returns allowed foods + fasting meal constraints

import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { FastingDay, FastingType, Location } from '@/types'

// ── 1. Location Resolution ────────────────────

/**
 * Resolve a zip code to lat/long using Zippopotam.us (free, no API key).
 * Falls back to Google Maps Geocoding API if zip is not found.
 *
 * Country codes: 'us', 'gb', 'in', 'ca', 'au', 'sg', 'ae' etc.
 */
export async function resolveZipToLocation(
  zip: string,
  country: string
): Promise<Location | null> {
  try {
    // Primary: Zippopotam.us — free, no key needed
    const res = await fetch(
      `https://api.zippopotam.us/${country.toLowerCase()}/${zip}`,
      { next: { revalidate: 86400 } }   // cache for 24 hours
    )
    if (!res.ok) throw new Error('Zippopotam failed')

    const data = await res.json()
    const place = data.places?.[0]
    if (!place) throw new Error('No place found')

    const lat = parseFloat(place.latitude)
    const lng = parseFloat(place.longitude)

    // Get timezone from lat/lng using tz-lookup
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tzlookup = require('tz-lookup')
    const timezone = tzlookup(lat, lng) as string

    return {
      zip,
      lat,
      lng,
      city: place['place name'],
      country: data['country abbreviation'],
      timezone,
    }
  } catch {
    // Fallback: Google Maps Geocoding (requires GOOGLE_MAPS_API_KEY)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) return null

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${apiKey}`
      )
      const data = await res.json()
      const result = data.results?.[0]
      if (!result) return null

      const lat = result.geometry.location.lat
      const lng = result.geometry.location.lng
      const city = result.address_components.find(
        (c: { types: string[] }) => c.types.includes('locality')
      )?.long_name ?? zip

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tzlookup = require('tz-lookup')
      const timezone = tzlookup(lat, lng) as string

      return { zip, lat, lng, city, country, timezone }
    } catch {
      return null
    }
  }
}

// ── 2. Fasting Day Configuration ──────────────
// Each fasting type has a list of allowed and restricted foods.
// These are used to filter the meal plan on fasting days.

export interface FastingConfig {
  type: FastingType
  displayName: string
  description: string
  allowed_foods: string[]
  restricted_foods: string[]
  protein_sources: string[]      // protein-rich allowed foods for gap mitigation
}

export const FASTING_CONFIGS: Record<FastingType, FastingConfig> = {
  ekadashi: {
    type: 'ekadashi',
    displayName: 'Ekadashi',
    description: 'Observed on the 11th lunar day (Tithi 11) of each fortnight. ' +
                 'A day to rest the digestive system, purify the mind, and offer devotion. ' +
                 'Grains and most legumes are avoided.',
    allowed_foods: [
      'Potatoes', 'Sweet potato', 'Milk & dairy', 'Paneer', 'Curd (yoghurt)',
      'Fruits (all)', 'Dry fruits & nuts', 'Peanuts', 'Water chestnuts (singhara)',
      'Sabudana (tapioca)', 'Kuttu atta (buckwheat)', 'Singhara atta (water chestnut flour)',
      'Ghee', 'Rock salt (sendha namak)', 'Honey', 'Coconut', 'Herbal teas',
      'Amaranth (rajgira)', 'Sama rice (barnyard millet)',
    ],
    restricted_foods: [
      'All grains (rice, wheat, roti, bread, upma)', 'Most legumes (dal, rajma, chole)',
      'Regular salt (use sendha namak only)', 'Onion & garlic',
      'Non-vegetarian food', 'Processed foods',
    ],
    protein_sources: ['Paneer', 'Curd', 'Peanuts', 'Milk', 'Dry fruits'],
  },
  navratri: {
    type: 'navratri',
    displayName: 'Navratri',
    description: 'Nine-day festival observed twice yearly (Chaitra & Ashvin Shukla Paksha). ' +
                 'Fasting rules apply for all 9 days. Special ingredients like kuttu atta, ' +
                 'singhara atta, and sendha namak replace regular staples.',
    allowed_foods: [
      'Kuttu atta (buckwheat flour)', 'Singhara atta (water chestnut flour)',
      'Sama rice (barnyard millet)', 'Sabudana (tapioca)', 'Potatoes', 'Sweet potato',
      'Milk & dairy', 'Paneer', 'Curd', 'Ghee', 'Fruits (all)', 'Nuts & dry fruits',
      'Peanuts', 'Rock salt (sendha namak)', 'Coconut', 'Makhana (fox nuts)',
      'Rajgira (amaranth)', 'Honey', 'Herbal teas',
    ],
    restricted_foods: [
      'Regular grains (wheat, rice, maida)', 'All legumes (dal, chole)',
      'Regular salt', 'Onion & garlic', 'Non-vegetarian food',
      'Alcohol', 'Processed or packaged food',
    ],
    protein_sources: ['Paneer', 'Curd', 'Peanuts', 'Milk', 'Makhana', 'Rajgira'],
  },
  pradosham: {
    type: 'pradosham',
    displayName: 'Pradosham',
    description: 'Observed on the 13th lunar day (Trayodashi) — dedicated to Lord Shiva. ' +
                 'Partial fast from sunrise to sunset. Evening puja followed by a light meal.',
    allowed_foods: ['Fruits', 'Milk', 'Curd', 'Nuts', 'Light sattvic food after sunset'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic', 'Alcohol', 'Grains (ideally)'],
    protein_sources: ['Milk', 'Curd', 'Nuts'],
  },
  amavasya: {
    type: 'amavasya',
    displayName: 'Amavasya (New Moon)',
    description: 'New moon day — associated with ancestors (Pitru Tarpan). ' +
                 'Many observe a partial or full fast and avoid non-vegetarian food.',
    allowed_foods: ['Sattvic vegetarian food', 'Fruits', 'Milk', 'Light grains after prayer'],
    restricted_foods: ['Non-vegetarian food', 'Alcohol', 'Onion', 'Garlic'],
    protein_sources: ['Milk', 'Dal (if not full fast)', 'Curd'],
  },
  monday_fast: {
    type: 'monday_fast',
    displayName: 'Monday Fast (Somvar Vrat)',
    description: 'Monday fast dedicated to Lord Shiva. Usually observed once a day ' +
                 '(one meal in the evening) or as a fruit/milk fast.',
    allowed_foods: ['Fruits', 'Milk', 'Curd', 'Sabudana', 'One light grain meal in evening'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic'],
    protein_sources: ['Milk', 'Curd', 'Sabudana with peanuts'],
  },
  thursday_fast: {
    type: 'thursday_fast',
    displayName: 'Thursday Fast (Guruvar Vrat)',
    description: 'Thursday fast dedicated to Lord Vishnu / Guru. One meal a day, ' +
                 'usually yellow-coloured foods (turmeric, dal, banana).',
    allowed_foods: ['Yellow foods (chana dal, banana, besan)', 'Fruits', 'Milk', 'Light grain meal'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic', 'Salt (traditionally)'],
    protein_sources: ['Chana dal', 'Milk', 'Peanuts'],
  },
  // Aliases for UI-facing fasting type values
  monday: {
    type: 'monday',
    displayName: 'Monday Fast',
    description: 'Monday fast dedicated to Lord Shiva.',
    allowed_foods: ['Fruits', 'Milk', 'Curd', 'Sabudana', 'One light grain meal in evening'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic'],
    protein_sources: ['Milk', 'Curd', 'Sabudana with peanuts'],
  },
  thursday: {
    type: 'thursday',
    displayName: 'Thursday Fast',
    description: 'Thursday fast dedicated to Lord Vishnu.',
    allowed_foods: ['Yellow foods (chana dal, banana)', 'Fruits', 'Milk', 'Light grain meal'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic'],
    protein_sources: ['Chana dal', 'Milk', 'Peanuts'],
  },
  saturday: {
    type: 'saturday',
    displayName: 'Saturday Fast (Shani Vrat)',
    description: 'Saturday fast dedicated to Lord Shani. One simple meal, typically at night.',
    allowed_foods: ['Sesame (til) foods', 'Black urad dal', 'Fruits', 'Milk', 'Light grain meal'],
    restricted_foods: ['Non-vegetarian food', 'Oil-heavy food', 'Alcohol'],
    protein_sources: ['Urad dal', 'Milk', 'Peanuts'],
  },
  pradosh: {
    type: 'pradosh',
    displayName: 'Pradosh',
    description: 'Observed on the 13th lunar day — dedicated to Lord Shiva.',
    allowed_foods: ['Fruits', 'Milk', 'Curd', 'Nuts', 'Light sattvic food after sunset'],
    restricted_foods: ['Non-vegetarian food', 'Onion', 'Garlic', 'Alcohol', 'Grains (ideally)'],
    protein_sources: ['Milk', 'Curd', 'Nuts'],
  },
  purnima: {
    type: 'purnima',
    displayName: 'Purnima (Full Moon)',
    description: 'Full moon day — auspicious for fasting and prayer.',
    allowed_foods: ['Sattvic vegetarian food', 'Fruits', 'Milk', 'Light grains after prayer'],
    restricted_foods: ['Non-vegetarian food', 'Alcohol', 'Onion', 'Garlic'],
    protein_sources: ['Milk', 'Dal (if not full fast)', 'Curd'],
  },
}

// ── 3. Fasting Day Detection ──────────────────
// NOTE: In production, replace the stub below with a real
// panchanga library (e.g. `panchanga` npm package) that uses
// lat/long to compute exact tithi for each calendar day.
//
// The `panchanga` library calculates tithi based on the angle
// between the Sun and Moon, adjusted for the observer's longitude.
// Tithi 11 of each Paksha = Ekadashi.
// Tithi 1–9 of Ashvin/Chaitra Shukla Paksha = Navratri.
//
// Until the library is integrated, we provide a deterministic
// stub that returns hard-coded dates for testing.

/**
 * Get all fasting days in a given week for a user's fasting preferences.
 *
 * @param weekStart  - Monday of the week (Date object)
 * @param fastingTypes - User's selected fasting traditions
 * @param location   - User's resolved location (for panchang calculation)
 * @returns Array of FastingDay objects (0–7 per week)
 */
export function getFastingDaysForWeek(
  weekStart: Date,
  fastingTypes: FastingType[],
  location: Pick<Location, 'lat' | 'lng' | 'timezone'>
): FastingDay[] {
  const days: FastingDay[] = []

  // Generate 7 days of the week
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')

    for (const fastType of fastingTypes) {
      if (isFastingDay(date, fastType, location)) {
        const config = FASTING_CONFIGS[fastType]
        days.push({
          date: dateStr,
          fastingType: fastType,
          type: fastType,
          name: config.displayName,
          allowed_foods: config.allowed_foods,
          restricted_foods: config.restricted_foods,
        })
      }
    }
  }

  return days
}

/**
 * Check if a given date is a fasting day of the given type.
 *
 * TODO: Replace stub logic with real panchanga library calculation:
 *   import { Panchanga } from 'panchanga'
 *   const p = new Panchanga(date, lat, lng)
 *   const tithi = p.getTithi()
 *   return tithi.index === 11 // for Ekadashi
 */
function isFastingDay(
  date: Date,
  fastType: FastingType,
  _location: Pick<Location, 'lat' | 'lng' | 'timezone'>
): boolean {
  // STUB: returns deterministic results for demonstration
  // In production: use panchanga library with lat/lng for accuracy
  const dayOfMonth = date.getDate()
  const month = date.getMonth() + 1

  switch (fastType) {
    case 'ekadashi':
      // Ekadashi falls roughly on the 11th and 26th of each month
      // Real calculation uses lunar tithi 11 of each paksha
      return dayOfMonth === 11 || dayOfMonth === 26

    case 'navratri':
      // Spring Navratri: late March–early April (roughly)
      // Autumn Navratri: late September–early October (roughly)
      // Real calculation: Pratipada to Navami of Chaitra/Ashvin Shukla
      return (month === 3 && dayOfMonth >= 22) ||
             (month === 4 && dayOfMonth <= 2) ||
             (month === 9 && dayOfMonth >= 22) ||
             (month === 10 && dayOfMonth <= 2)

    case 'pradosham':
      // Pradosham falls on Tithi 13 of each paksha (roughly 13th and 28th)
      return dayOfMonth === 13 || dayOfMonth === 28

    case 'amavasya':
      // New moon — roughly once a month on varying dates
      return dayOfMonth === 1 || dayOfMonth === 30

    case 'monday_fast':
      return date.getDay() === 1 // Monday

    case 'thursday_fast':
      return date.getDay() === 4 // Thursday

    default:
      return false
  }
}

/**
 * Get the start of the current week (Monday).
 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Format a week range for display: "26 Mar – 1 Apr 2026"
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startStr = format(weekStart, 'd MMM')
  const endStr = format(weekEnd, 'd MMM yyyy')
  return `${startStr} – ${endStr}`
}
