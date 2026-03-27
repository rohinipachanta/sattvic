// ─────────────────────────────────────────────
// API Route: GET /api/export-calendar?weekStart=YYYY-MM-DD
// ─────────────────────────────────────────────
// Generates a .ics calendar file for the week's meal plan.
// Works with Google Calendar, Apple Calendar, and Outlook.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromCookies } from '@/lib/supabase/server'
import { createEvents, EventAttributes } from 'ics'
import type { DayPlan, Meal } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientFromCookies()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')
    if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

    const { data: plan } = await supabase
      .from('meal_plans')
      .select('plan_data')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart)
      .single()

    if (!plan) return NextResponse.json({ error: 'No plan found for this week' }, { status: 404 })

    const week: DayPlan[] = plan.plan_data.week ?? plan.plan_data.days ?? []
    const events: EventAttributes[] = []

    for (const day of week) {
      const dateParts = day.date.split('-').map(Number) as [number, number, number]

      // Helper to find a meal by type
      const getMeal = (type: string): Meal | undefined =>
        day.meals.find((m: Meal) => (m.meal_type ?? '').toLowerCase() === type.toLowerCase())

      const breakfast = getMeal('breakfast')
      const lunch     = getMeal('lunch')
      const dinner    = getMeal('dinner')

      if (day.is_fasting) {
        events.push({
          title: `🌙 ${day.fasting_type === 'ekadashi' ? 'Ekadashi' : 'Fasting'} Day`,
          start: dateParts,
          duration: { days: 1 },
          description: [
            `Fasting today — ${day.fasting_type ?? ''}`,
            '',
            breakfast ? `🌅 Breakfast: ${breakfast.name}` : '',
            lunch     ? `☀️  Lunch: ${lunch.name}`        : '',
            dinner    ? `🌙 Dinner: ${dinner.name}`        : '',
          ].filter(Boolean).join('\n'),
          categories: ['Sattvic', 'Fasting'],
          status: 'CONFIRMED',
        })
      } else {
        const mealSlots: [string, Meal | undefined, [number, number, number, number, number]][] = [
          ['Breakfast', breakfast, [...dateParts, 8,  0 ] as [number, number, number, number, number]],
          ['Lunch',     lunch,     [...dateParts, 13, 0 ] as [number, number, number, number, number]],
          ['Dinner',    dinner,    [...dateParts, 19, 30] as [number, number, number, number, number]],
        ]

        for (const [type, meal, startTime] of mealSlots) {
          if (!meal) continue
          const emoji = type === 'Breakfast' ? '🌅' : type === 'Lunch' ? '☀️' : '🌙'
          const protein  = meal.nutrition?.protein_g  ?? meal.protein_g  ?? 0
          const calories = meal.nutrition?.calories   ?? meal.calories   ?? 0

          events.push({
            title: `${emoji} ${type} — ${meal.name}`,
            start: startTime,
            duration: { minutes: 30 },
            description: [
              meal.description ? `🌿 ${meal.description}` : '',
              `💪 Protein: ${protein}g · Calories: ${calories} kcal`,
              meal.ingredients?.length
                ? `Ingredients: ${meal.ingredients.slice(0, 5).join(', ')}`
                : '',
            ].filter(Boolean).join('\n'),
            categories: ['Sattvic', 'Meal'],
            status: 'CONFIRMED',
          })
        }
      }
    }

    const { value, error } = createEvents(events)
    if (error || !value) {
      return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 })
    }

    return new NextResponse(value, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="sattvic-${weekStart}.ics"`,
      },
    })
  } catch (err) {
    console.error('export-calendar error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
