// ─────────────────────────────────────────────
// API Route: GET /api/export-calendar?weekStart=YYYY-MM-DD
// ─────────────────────────────────────────────
// Generates a .ics calendar file for the week's meal plan.
// Works with Google Calendar, Apple Calendar, and Outlook.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientFromCookies } from '@/lib/supabase-server'
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

      // Helper: find meal by type from the meals array
      const getMeal = (type: string): Meal | undefined =>
        (day.meals ?? []).find((m: Meal) => m.meal_type === type)

      const breakfast = getMeal('breakfast')
      const lunch     = getMeal('lunch')
      const dinner    = getMeal('dinner')

      if (day.is_fasting) {
        // Fasting day → all-day event
        const lines: string[] = [
          `Fasting today — ${day.fasting_type ?? 'fasting'}`,
          '',
        ]
        if (breakfast) lines.push(`🌅 Breakfast: ${breakfast.name}`)
        if (lunch)     lines.push(`☀️  Lunch: ${lunch.name}`)
        if (dinner)    lines.push(`🌙 Dinner: ${dinner.name}`)
        if (day.daily_totals) lines.push('', `Protein today: ${day.daily_totals.protein_g}g`)

        events.push({
          title: `🌙 ${day.fasting_type === 'ekadashi' ? 'Ekadashi' : 'Navratri'} — Fasting Day`,
          start: dateParts,
          duration: { days: 1 },
          description: lines.join('\n'),
          categories: ['Sattvic', 'Fasting'],
          status: 'CONFIRMED',
        })
      } else {
        // Regular day → meal events
        const mealSlots: [string, Meal | undefined, [number, number, number, number, number]][] = [
          ['Breakfast', breakfast, [...dateParts, 8, 0]  as [number, number, number, number, number]],
          ['Lunch',     lunch,     [...dateParts, 13, 0] as [number, number, number, number, number]],
          ['Dinner',    dinner,    [...dateParts, 19, 30] as [number, number, number, number, number]],
        ]

        for (const [type, meal, startTime] of mealSlots) {
          if (!meal) continue
          const emoji = type === 'Breakfast' ? '🌅' : type === 'Lunch' ? '☀️' : '🌙'
          const descLines: string[] = []

          if (meal.ayurvedic_guna || meal.dosha_effect) {
            descLines.push(`🌿 ${meal.ayurvedic_guna ?? ''} · ${meal.dosha_effect ?? ''}`.trim())
          }
          const protein  = meal.protein_g  ?? meal.nutrition?.protein_g
          const calories = meal.calories    ?? meal.nutrition?.calories
          if (protein || calories) {
            descLines.push(`💪 Protein: ${protein ?? '?'}g · Calories: ${calories ?? '?'} kcal`)
          }
          if (meal.accompaniments && meal.accompaniments.length > 0) {
            const acc = meal.accompaniments[0]
            descLines.push(`💡 Suggestion: ${acc.name} — ${acc.reason ?? acc.benefit ?? ''}`)
          }
          if (meal.ingredients && meal.ingredients.length > 0) {
            descLines.push('', `Ingredients: ${meal.ingredients.slice(0, 5).join(', ')}`)
          }

          events.push({
            title: `${emoji} ${type} — ${meal.name}`,
            start: startTime,
            duration: { minutes: 30 },
            description: descLines.filter(Boolean).join('\n'),
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
