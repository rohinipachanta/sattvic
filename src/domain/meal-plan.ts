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
  muscle_gain: 'High protein at every meal (1.6-2g/kg). Include legumes, paneer, nuts. Support with complex carbs around workout time.',
  diabetes_management: 'Low GI meals. Higher protein (1.4g/kg). Avoid white rice and maida. Include bitter gourd, fenugreek, and methi.',
  heart_health: 'Low saturated fat. Include omega-3 rich foods (flaxseed, walnuts). Reduce sodium. Favour whole grains and soluble fibre.',
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
  // Alias entries for all HealthCondition values
  diabetes: 'Low GI meals. Avoid refined sugars and white rice. Include bitter gourd and fenugreek.',
  hypertension: 'Low sodium. Include potassium-rich foods (bananas, sweet potatoes). Avoid pickles.',
  thyroid: 'Cook cruciferous vegetables. Include selenium and iodine in balance. Limit soy.',
  pregnancy: 'Nutrient-dense meals. Higher folate, iron, calcium. Avoid raw papaya and pineapple.',
  heart_disease: 'Low saturated fat. Include omega-3 rich foods. Reduce sodium. Whole grains only.',
  kidney_disease: 'Low potassium and phosphorus. Limit protein to prescribed levels. Avoid high-sodium foods.',
  lactose_intolerant: 'Avoid cow milk and heavy dairy. Coconut milk or oat milk. Small amounts of curd may be fine.',
  gluten_intolerant: 'No wheat, semolina, or barley. Use rice, millets, buckwheat, quinoa.',
  nut_allergy: 'Avoid all nuts and nut-derived oils. Check for hidden nut ingredients in recipes.',
}

// ── Prompt Builder ────────────────────────────

export interface PromptParams {
  familyMembers: FamilyMember[]
  fastingDays:   FastingDay[]
  weekStart:     Date
  hemisphere:    'north' | 'south'
  cuisines:      Cuisine[]
  /** 0-indexed offset from weekStart — default 0 */
  startDay?:     number
  /** how many days to generate — default 7 */
  dayCount?:     number
  /** meal names already generated this week — AI must not repeat these */
  avoidMeals?:   string[]
}

export function buildMealPlanPrompt(params: PromptParams): string {
  const { familyMembers, fastingDays, weekStart, hemisphere, cuisines } = params
  const actualStartDay = params.startDay ?? 0
  const actualDayCount = params.dayCount ?? 7
  const avoidMeals = params.avoidMeals ?? []
  const season = getCurrentSeason(weekStart, hemisphere)
  const weekDates = Array.from({ length: actualDayCount }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + actualStartDay + i)
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

  // ── Build hard dietary restriction lines ──
  const dietaryRules = familyMembers.map(m => {
    const rules: string[] = []
    const diet = m.dietary_preference
    if (diet === 'vegetarian' || diet === 'vegan' || diet === 'jain')
      rules.push(`${m.name} is ${diet.toUpperCase()}: ZERO meat, fish, chicken, or seafood — ever.`)
    if (diet === 'vegan')
      rules.push(`${m.name} is VEGAN: No dairy (milk, paneer, ghee, curd, butter, cream) — ever.`)
    if (diet === 'jain')
      rules.push(`${m.name} is JAIN: No root vegetables (onion, garlic, potato, carrot, beetroot).`)
    m.health_conditions.forEach(c => {
      if (c === 'diabetes' || c === 'diabetes_type2')
        rules.push(`${m.name} has DIABETES: NO white rice, maida, refined sugar, or high-GI foods.`)
      if (c === 'gluten_intolerant' || c === 'gluten_sensitivity')
        rules.push(`${m.name} is GLUTEN INTOLERANT: Absolutely NO wheat, atta, roti, bread, semolina, or barley.`)
      if (c === 'lactose_intolerant' || c === 'lactose_intolerance')
        rules.push(`${m.name} is LACTOSE INTOLERANT: No cow milk, paneer, or cream. Small curd OK. Coconut/oat milk preferred.`)
      if (c === 'nut_allergy')
        rules.push(`${m.name} has NUT ALLERGY: ZERO nuts or nut-derived ingredients in any meal.`)
      if (c === 'kidney_disease')
        rules.push(`${m.name} has KIDNEY DISEASE: Low potassium, low phosphorus, low sodium. Restrict high-protein foods.`)
    })
    return rules
  }).flat()

  const dietarySection = dietaryRules.length > 0
    ? dietaryRules.map(r => `⚠️ ${r}`).join('\n')
    : 'No hard dietary restrictions — follow standard Ayurvedic guidelines.'

  // ── Build dosha guidance per member ──
  const doshaGuidance = familyMembers.map(m => {
    if (!m.dosha) return null
    const doshaFoods: Record<string, { favour: string; avoid: string }> = {
      vata:       { favour: 'warm, oily, grounding foods — soups, khichdi, sesame, root vegetables, ghee, warm milk', avoid: 'cold, raw, dry, light foods — salads, crackers, carbonated drinks' },
      pitta:      { favour: 'cooling, sweet, bitter foods — coconut, coriander, fennel, cucumber, sweet fruits, leafy greens', avoid: 'spicy, sour, oily, fermented foods — chilli, tamarind, vinegar, fried food' },
      kapha:      { favour: 'light, dry, spiced foods — millet, barley, bitter greens, ginger, black pepper, honey, legumes', avoid: 'heavy, sweet, oily, cold foods — wheat, dairy, fried items, sugar, cold drinks' },
      vata_pitta: { favour: 'warm, mildly spiced, nourishing — khichdi, root vegetables, coconut milk curries, moderate ghee', avoid: 'extremes — very spicy OR very cold/raw' },
      pitta_kapha:{ favour: 'light, cooling, lightly spiced — millets, bitter vegetables, legumes, coconut', avoid: 'heavy, oily, very spicy or sour foods' },
      vata_kapha: { favour: 'warm, lightly spiced, easy to digest — cooked vegetables, moong dal, ginger tea, warm soups', avoid: 'cold foods, heavy dairy, raw salads, refined carbs' },
    }
    const guide = doshaFoods[m.dosha]
    return guide ? `${m.name} (${m.dosha}): Favour ${guide.favour}. Avoid ${guide.avoid}.` : null
  }).filter(Boolean)

  return `You are Sattvic, an expert Ayurvedic nutritionist and Indian home cook.
Generate a ${actualDayCount}-day personalised meal plan for this family.

═══════════════════════════════════════════════════════════
⚠️  HARD DIETARY RULES — THESE OVERRIDE EVERYTHING ELSE
═══════════════════════════════════════════════════════════
${dietarySection}

If any rule above is violated, the output is INVALID. Double-check every meal against every rule before writing your response.

═══════════════════════════════════════════════════════════
🚫  ANTI-REPETITION MANDATE
═══════════════════════════════════════════════════════════
${avoidMeals.length > 0
  ? `These dishes are ALREADY PLANNED this week. You MUST NOT use any of them:\n${avoidMeals.map(m => `  ✗ ${m}`).join('\n')}`
  : 'No dishes planned yet — still ensure NO dish repeats within this batch.'}

Every breakfast, every lunch, every dinner across all ${actualDayCount} days must be a COMPLETELY DIFFERENT dish.
Think of the FULL diversity of Indian cooking: Tamil, Kerala, Karnataka, Andhra, Maharashtra, Gujarat, Rajasthan, Bengal, Punjab, Himachal — draw from all of them.
Explore dishes beyond the basics: pesarattu, akki roti, thalipeeth, thepla, dhokla, adai, pongal, bisi bele bath, zunka, pitla, kootu, avial, chettinad curries, Kashmiri saag, and more.

═══════════════════════════════════════════════════════════
👨‍👩‍👧  FAMILY PROFILES
═══════════════════════════════════════════════════════════
${memberProfiles}

═══════════════════════════════════════════════════════════
🌿  DOSHA-BASED FOOD GUIDANCE
═══════════════════════════════════════════════════════════
${doshaGuidance.length > 0 ? doshaGuidance.join('\n') : 'Balanced plan — no specific dosha focus.'}

═══════════════════════════════════════════════════════════
📅  WEEK DATES
═══════════════════════════════════════════════════════════
${weekDates.join('\n')}

═══════════════════════════════════════════════════════════
🙏  FASTING DAYS
═══════════════════════════════════════════════════════════
${fastingSection}

═══════════════════════════════════════════════════════════
🍂  AYURVEDIC SEASON
═══════════════════════════════════════════════════════════
${seasonSection}

═══════════════════════════════════════════════════════════
🍽️  CUISINE PREFERENCES
═══════════════════════════════════════════════════════════
Preferred cuisines: ${cuisineSection}
Rotate through these cuisines day to day. Do not serve the same regional cuisine two days in a row.

═══════════════════════════════════════════════════════════
📋  COOKING INSTRUCTIONS
═══════════════════════════════════════════════════════════
1. Generate breakfast, lunch, and dinner for each of the ${actualDayCount} days above.
2. Fasting days: ONLY use allowed foods listed. Zero restricted foods.
3. Suggest 1–2 dosha-balancing accompaniments per meal.
4. Hit or approach each member's daily protein target.
5. Meals must be realistic Indian HOME cooking, not restaurant or fusion food.
6. Mark each meal's Ayurvedic Guna (sattvik / rajasic / tamasic) and dosha effect.
7. Include goal_alignment listing which health goals each meal supports.

═══════════════════════════════════════════════════════════
🔴  JSON STRUCTURE — NON-NEGOTIABLE
═══════════════════════════════════════════════════════════
ONE shared meal per meal_type for the WHOLE family.
NEVER use family member names as JSON keys anywhere.
NEVER split meals by person. All fields must be plain strings or numbers.
Use the accompaniments array for any per-member notes.

❌ WRONG — never do this:
"breakfast": { "${familyMembers.map(m => m.name).join('": {...}, "')}" : {...} }

✅ CORRECT — always do this:
"breakfast": { "name": "Pesarattu", "ingredients": [...], "accompaniments": [...] }

Return ONLY valid JSON — no markdown fences, no explanation, no extra keys.

{
  "week": [
    {
      "date": "YYYY-MM-DD",
      "day": "Monday",
      "is_fasting": false,
      "meals": {
        "breakfast": {
          "name": "string — the dish name",
          "cuisine": "string",
          "protein_g": number,
          "calories": number,
          "carbs_g": number,
          "fat_g": number,
          "fiber_g": number,
          "sodium_mg": number,
          "ayurvedic_guna": "sattvik",
          "dosha_effect": "string",
          "health_notes": "string",
          "goal_alignment": ["energy"],
          "ingredients": ["ingredient 1", "ingredient 2"],
          "ayurvedic_notes": "string",
          "accompaniments": [
            { "name": "string", "reason": "string", "dosha_benefit": "string", "optional": true }
          ]
        },
        "lunch": { "name": "string", "cuisine": "string", "protein_g": 0, "calories": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "sodium_mg": 0, "ayurvedic_guna": "sattvik", "dosha_effect": "", "health_notes": "", "goal_alignment": [], "ingredients": [], "ayurvedic_notes": "", "accompaniments": [] },
        "dinner": { "name": "string", "cuisine": "string", "protein_g": 0, "calories": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "sodium_mg": 0, "ayurvedic_guna": "sattvik", "dosha_effect": "", "health_notes": "", "goal_alignment": [], "ingredients": [], "ayurvedic_notes": "", "accompaniments": [] }
      },
      "daily_totals": { "protein_g": 0, "calories": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0 }
    }
  ]
}
`
}

/**
 * If Gemini accidentally returned a field as a per-member object
 * (e.g. name: { "Roh": "Poha", "Vasu": "Upma" }) instead of a string,
 * extract the first string value so the UI never receives a plain object.
 */
function flattenField(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value
  // It's a plain object — take the first value (per-member accident)
  const vals = Object.values(value as Record<string, unknown>)
  return vals.length > 0 ? flattenField(vals[0]) : undefined
}

function sanitizeMeal(m: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(m)) {
    // Keep arrays and objects that look like accompaniments / nutrition intact
    if (k === 'accompaniments' || k === 'ingredients' || k === 'goal_alignment' || k === 'instructions') {
      safe[k] = Array.isArray(v) ? v : []
    } else if (k === 'nutrition') {
      safe[k] = v // keep as-is, it's a structured object
    } else {
      safe[k] = flattenField(v)
    }
  }
  return safe
}

/**
 * Normalize a single day's meals into an array.
 * Gemini may return meals as an object { breakfast: {...}, lunch: {...}, dinner: {...} }
 * or as an array [ { meal_type: 'breakfast', ... }, ... ].
 * The UI always expects an array with a meal_type field on each item.
 */
function normalizeMeals(day: Record<string, unknown>): DayPlan['meals'] {
  const meals = day.meals
  if (Array.isArray(meals)) {
    // Already an array — ensure each item has meal_type and date
    return meals.map((m: unknown) => {
      const meal = sanitizeMeal(m as Record<string, unknown>)
      return {
        ...meal,
        meal_type: meal.meal_type ?? undefined,
        date: meal.date ?? day.date,
        id: meal.id ?? `${day.date}_${meal.meal_type ?? 'meal'}`,
      } as DayPlan['meals'][number]
    })
  }

  if (meals && typeof meals === 'object') {
    // Object form — convert { breakfast: {...}, lunch: {...}, dinner: {...} } → array
    const mealsObj = meals as Record<string, unknown>
    return (['breakfast', 'lunch', 'dinner', 'snack'] as const)
      .filter(type => mealsObj[type] != null && typeof mealsObj[type] === 'object' && !Array.isArray(mealsObj[type]))
      .map(type => {
        const raw = mealsObj[type] as Record<string, unknown>
        const m = sanitizeMeal(raw)
        return {
          ...m,
          meal_type: type,
          date: m.date ?? day.date,
          id: m.id ?? `${day.date}_${type}`,
          // Flatten nutrition fields if they are at root level
          nutrition: m.nutrition ?? {
            calories:  m.calories,
            protein_g: m.protein_g,
            carbs_g:   m.carbs_g,
            fat_g:     m.fat_g,
            fibre_g:   m.fiber_g ?? m.fibre_g,
            sodium_mg: m.sodium_mg,
          },
        } as DayPlan['meals'][number]
      })
  }

  return []
}

/**
 * Validate the parsed Gemini response to ensure it has the right structure,
 * and normalize meals from object form to array form.
 * Returns null if invalid, the typed plan if valid.
 */
export function validateMealPlanResponse(
  parsed: unknown
): { week: DayPlan[] } | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.week) || obj.week.length === 0) return null
  // Validate structure and normalize each day's meals
  const normalizedWeek: DayPlan[] = []
  for (const day of obj.week as unknown[]) {
    const d = day as Record<string, unknown>
    if (!d.date || !d.meals) return null
    normalizedWeek.push({
      ...(d as unknown as DayPlan),
      meals: normalizeMeals(d),
    })
  }
  return { week: normalizedWeek }
}
