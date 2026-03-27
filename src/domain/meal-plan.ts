// ─────────────────────────────────────────────
// Sattvic — Gemini Meal Plan Prompt Builder
// ─────────────────────────────────────────────
// Think of this like writing a detailed brief
// for a chef consultant (Gemini).
// The better the brief, the better the meal plan.
//
// This file builds the prompt string and defines
// the exact JSON format we expect back.

import type {
  FamilyMember, FastingDay, AyurvedicSeason, Cuisine,
  HealthGoal, HealthCondition, Dosha, DayPlan
} from '@/types'
import { calcProteinTarget } from './protein'
import { getCurrentSeason } from './ayurveda'
import { format } from 'date-fns'

// ── Human-readable label maps ─────────────────

const DOSHA_LABELS: Record<Dosha, string> = {
  vata: 'Vata (light, creative, prone to anxiety and dryness)',
  pitta: 'Pitta (intense, focused, prone to heat and inflammation)',
  kapha: 'Kapha (steady, grounded, prone to sluggishness and weight gain)',
  vata_pitta: 'Vata-Pitta dual (energetic but prone to burnout and heat)',
  pitta_kapha: 'Pitta-Kapha dual (determined, steady but can overheat)',
  vata_kapha: 'Vata-Kapha dual (creative with resilience, irregular digestion)',
}

const GOAL_INSTRUCTIONS: Record<HealthGoal, string> = {
  weight_loss: 'Aim for a ~200 kcal daily deficit. Higher protein, lower refined carbs, more fibre.',
  weight_gain: 'Aim for a ~300 kcal daily surplus. Higher complex carbs, protein at every meal.',
  energy: 'Prioritise sustained-energy meals — no heavy lunches. Energising breakfasts, warm spiced foods, avoid Tamasic (heavy, stale) foods.',
  gut_health: 'Prioritise probiotic-rich foods (curd, buttermilk, kanji), Agni-supporting spices (ginger, cumin, ajwain). Avoid raw and cold foods.',
  hormonal_balance: 'Include anti-inflammatory foods, lignans (sesame, flax), phytoestrogen-rich legumes. Reduce Rajasic foods. Support liver with bitter greens and turmeric.',
  muscle_gain: 'Higher protein (1.6–2g/kg). Include complete proteins at every meal — paneer, legumes, dairy. Time protein around activity.',
  diabetes_management: 'Low GI throughout. Consistent meal timing. Include bitter gourd, fenugreek, cinnamon. Avoid refined carbs and sugary foods.',
  heart_health: 'Reduce saturated fat. Include omega-3 rich walnuts and flaxseed. Garlic, turmeric, and oats are cardioprotective. Low sodium.',
}

const CONDITION_NOTES: Record<HealthCondition, string> = {
  diabetes_type1: 'Low GI meals only. No refined sugar. Space meals evenly.',
  diabetes_type2: 'Low GI meals. Higher protein (1.4g/kg). Avoid white rice and maida. Include bitter gourd, fenugreek.',
  pcos: 'Anti-inflammatory. Reduce refined carbs. Include flaxseed, sesame, legumes for hormonal support.',
  hypothyroidism: 'Limit raw cruciferous (broccoli, cabbage) — cook them. Include selenium-rich foods. Avoid soy in excess.',
  hyperthyroidism: 'Cooling foods. Avoid iodine-rich seaweed. Include calcium-rich foods.',
  high_bp: 'Low sodium. Include potassium-rich foods (bananas, sweet potatoes). Avoid pickles and papads in excess.',
  high_cholesterol: 'Low saturated fat. Include oats, flaxseed, legumes, garlic, turmeric.',
  weight_management: 'Calorie-aware. High protein and fibre. Avoid fried and refined foods.',
  anaemia: 'Iron-rich foods (ragi, spinach, pomegranate, dates). Include vitamin C to enhance absorption.',
  ibs: 'Low FODMAP where possible. Avoid raw onion, garlic, beans. Favour cooked easy-to-digest foods.',
  lactose_intolerance: 'Avoid cow milk and heavy dairy. Coconut milk, oat milk, and small amounts of curd (lower lactose) are fine.',
  gluten_sensitivity: 'No wheat, semolina (rava), or barley. Use rice, millets, buckwheat, quinoa.',
  diabetes: 'Low GI meals. Consistent meal timing. Include bitter gourd, fenugreek, cinnamon. Avoid refined carbs.',
  hypertension: 'Low sodium diet. Potassium-rich foods. Avoid pickles, papads, processed foods. Calming spices.',
  thyroid: 'Cook cruciferous vegetables. Include selenium-rich foods. Moderate iodine. Avoid excess soy.',
  pregnancy: 'Nutrient-dense meals. High folate (green leafy veg, legumes). Iron and calcium rich. Avoid raw foods.',
  heart_disease: 'Low saturated fat. Cardioprotective spices (turmeric, garlic). Include omega-3 sources. Low sodium.',
  kidney_disease: 'Low potassium and phosphorus. Limit dairy. Controlled protein. Avoid high-oxalate foods.',
  lactose_intolerant: 'Avoid cow milk and heavy dairy. Coconut milk, oat milk, and small amounts of curd are fine.',
  gluten_intolerant: 'No wheat, semolina (rava), or barley. Use rice, millets, buckwheat, quinoa.',
  nut_allergy: 'Avoid all tree nuts and peanuts. Use seeds (sunflower, pumpkin) as alternatives for healthy fats.',
}

// ── Prompt Builder ────────────────────────────

export interface PromptParams {
  familyMembers: FamilyMember[]
  fastingDays:   FastingDay[]
  weekStart:     Date
  hemisphere:    'north' | 'south'
  cuisines:      Cuisine[]
}

export function buildMealPlanPrompt(params: PromptParams): string {
  const { familyMembers, fastingDays, weekStart, hemisphere, cuisines } = params
  const season = getCurrentSeason(weekStart, hemisphere)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return format(d, 'yyyy-MM-dd (EEEE)')
  })

  const fastingMap = new Map(fastingDays.map(f => [f.date, f]))

  // ── Member profiles section ──
  const memberProfiles = familyMembers.map(m => {
    const protein = calcProteinTarget(m)
    const doshaLabel = m.dosha ? DOSHA_LABELS[m.dosha] : 'Unknown (use balanced plan)'
    const conditionNotes = m.health_conditions.map(c => `  - ${CONDITION_NOTES[c]}`).join('\n')
    const goalInstructions = m.health_goals.map(g => `  - ${GOAL_INSTRUCTIONS[g]}`).join('\n')

    return `
### ${m.name} (${m.dietary_preference})
- Age: ${new Date().getFullYear() - new Date(m.date_of_birth).getFullYear()} years
- Dosha: ${doshaLabel}
- Health conditions:${m.health_conditions.length ? '\n' + conditionNotes : ' None'}
- Goals:${m.health_goals.length ? '\n' + goalInstructions : ' None specified'}
- Activity: ${m.activity_level}
- Daily protein target: ${protein ? `${protein.target_g}g (${protein.rationale})` : 'Unknown — no weight entered'}
`
  }).join('\n')

  // ── Fasting days section ──
  const fastingSection = fastingDays.length === 0
    ? 'No fasting days this week.'
    : fastingDays.map(f =>
        `- ${f.date}: ${f.name}\n  Allowed: ${(f.allowed_foods ?? []).slice(0, 8).join(', ')}\n  Restricted: ${(f.restricted_foods ?? []).slice(0, 5).join(', ')}`
      ).join('\n')

  // ── Season section ──
  const seasonSection = `Current season: ${season.displayName}
Dietary guidance: ${season.guidance}
Favour: ${season.favour.join(', ')}
Avoid: ${season.avoid.join(', ')}`

  // ── Cuisine preferences ──
  const cuisineSection = cuisines.map(c => c.replace('_', ' ')).join(', ')

  return `You are Sattvic, an expert Ayurvedic nutritionist and Indian meal planner.
Generate a 7-day personalised meal plan for this family.

## Family Profiles
${memberProfiles}

## Week Dates
${weekDates.join('\n')}

## Fasting Days This Week
${fastingSection}

## Ayurvedic Season
${seasonSection}

## Cuisine Preferences
${cuisineSection}

## Instructions
1. Generate breakfast, lunch, and dinner for each of the 7 days.
2. For fasting days, ONLY use allowed foods listed above. Absolutely no restricted foods.
3. For each meal, suggest 1–2 optional dosha-balancing accompaniments for each family member.
4. Ensure each day meets or approaches each member's protein target.
5. Vary cuisines across the week. Avoid repeating the same dish in the same week.
6. Meals should be realistic Indian home cooking — not restaurant food or exotic recipes.
7. Mark each meal's Ayurvedic Guna (sattvik / rajasic / tamasic) and primary dosha effect.
8. Include goal_alignment array listing which health goals this meal supports.

## Response Format
Return ONLY valid JSON in this exact structure (no markdown, no explanation):

{
  "week": [
    {
      "date": "YYYY-MM-DD",
      "day": "Monday",
      "is_fasting": false,
      "meals": {
        "breakfast": {
          "name": "string",
          "cuisine": "string",
          "protein_g": number,
          "calories": number,
          "carbs_g": number,
          "fat_g": number,
          "fiber_g": number,
          "sodium_mg": number,
          "ayurvedic_guna": "sattvik|rajasic|tamasic",
          "dosha_effect": "string",
          "health_notes": "string",
          "goal_alignment": ["weight_loss"|"weight_gain"|"energy"|"gut_health"|"hormonal_balance"],
          "ingredients": ["string"],
          "ayurvedic_notes": "string",
          "accompaniments": [
            {
              "name": "string",
              "reason": "string",
              "dosha_benefit": "string",
              "optional": true
            }
          ]
        },
        "lunch": { ...same structure... },
        "dinner": { ...same structure... }
      },
      "daily_totals": {
        "protein_g": number,
        "calories": number,
        "carbs_g": number,
        "fat_g": number,
        "fiber_g": number
      }
    }
  ]
}
`
}

/**
 * Validate the parsed Gemini response to ensure it has the right structure.
 * Returns null if invalid, the typed plan if valid.
 */
export function validateMealPlanResponse(
  parsed: unknown
): { week: DayPlan[] } | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.week) || obj.week.length !== 7) return null
  // Basic structure check
  for (const day of obj.week as unknown[]) {
    const d = day as Record<string, unknown>
    if (!d.date || !d.meals) return null
  }
  return parsed as { week: DayPlan[] }
}
