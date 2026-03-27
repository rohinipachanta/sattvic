// ─────────────────────────────────────────────
// Sattvic — Ayurvedic Domain Logic
// ─────────────────────────────────────────────
// Think of Ayurveda like a personalised weather forecast for your body.
// Just as you dress differently in summer vs. winter,
// you eat differently based on your dosha and the current season.
//
// This file contains:
//   1. Season detection (Ritucharya — the 6 Ayurvedic seasons)
//   2. Dosha accompaniment rules
//   3. Dosha quiz scoring

import type { AyurvedicSeason, Dosha, Accompaniment } from '@/types'

// ── 1. Ayurvedic Season Detection ─────────────
// The 6 Ayurvedic seasons (Ritucharya) are based on the Hindu calendar,
// roughly mapped to Northern Hemisphere months.
// Southern Hemisphere users get the inverse (6 months offset).

interface SeasonInfo {
  name: AyurvedicSeason
  displayName: string
  months: number[]        // 1–12
  guidance: string        // dietary advice for this season
  avoid: string[]
  favour: string[]
}

const SEASONS: SeasonInfo[] = [
  {
    name: 'vasanta',
    displayName: 'Vasanta (Spring)',
    months: [3, 4],       // March–April
    guidance: 'Light, bitter, and astringent foods to clear accumulated Kapha.',
    avoid: ['heavy dairy', 'sweets', 'fried food'],
    favour: ['bitter greens', 'barley', 'honey', 'ginger', 'light soups'],
  },
  {
    name: 'greeshma',
    displayName: 'Greeshma (Summer)',
    months: [5, 6],       // May–June
    guidance: 'Cooling, sweet, and hydrating foods to pacify Pitta.',
    avoid: ['spicy food', 'sour food', 'alcohol', 'fried food', 'excess salt'],
    favour: ['coconut water', 'cucumber', 'mint', 'coriander', 'ghee', 'cooling dairy'],
  },
  {
    name: 'varsha',
    displayName: 'Varsha (Monsoon)',
    months: [7, 8],       // July–August
    guidance: 'Easily digestible, warm, and lightly spiced food. Avoid raw and heavy foods.',
    avoid: ['leafy greens', 'raw salads', 'cold water', 'heavy legumes'],
    favour: ['khichdi', 'soups', 'warm ginger tea', 'rock salt', 'old grains'],
  },
  {
    name: 'sharad',
    displayName: 'Sharad (Autumn)',
    months: [9, 10],      // September–October
    guidance: 'Light, cooling foods to balance aggravated Pitta from summer.',
    avoid: ['yoghurt at night', 'sesame', 'pungent foods', 'excess oil'],
    favour: ['rice', 'moong dal', 'pomegranate', 'coconut', 'coriander', 'fennel'],
  },
  {
    name: 'hemanta',
    displayName: 'Hemanta (Early Winter)',
    months: [11, 12],     // November–December
    guidance: 'Nourishing, warming, and slightly heavy foods to build strength.',
    avoid: ['cold food', 'cold drinks', 'light / dry foods'],
    favour: ['ghee', 'sesame', 'warm soups', 'urad dal', 'jaggery', 'root vegetables'],
  },
  {
    name: 'shishira',
    displayName: 'Shishira (Late Winter)',
    months: [1, 2],       // January–February
    guidance: 'Heavy, warm, and nourishing foods. Similar to Hemanta but Vata increases.',
    avoid: ['cold, dry, or raw foods', 'bitter tastes in excess'],
    favour: ['warm oils', 'sesame', 'hot beverages', 'ghee', 'warm grains'],
  },
]

/**
 * Get the current Ayurvedic season based on month and hemisphere.
 */
export function getCurrentSeason(
  date: Date = new Date(),
  hemisphere: 'north' | 'south' = 'north'
): SeasonInfo {
  const month = date.getMonth() + 1 // 1–12
  // Southern Hemisphere: seasons are ~6 months offset
  const adjustedMonth = hemisphere === 'south'
    ? ((month + 5) % 12) + 1
    : month

  return SEASONS.find(s => s.months.includes(adjustedMonth)) ?? SEASONS[4] // fallback: hemanta
}

// ── 2. Dosha Accompaniment Engine ─────────────
// For each dosha, we define:
//   - What aggravates it (foods/qualities to watch for)
//   - What balances it (suggested accompaniments)
//
// Think of this like a flavour pairing rule:
// If a dish is spicy (Pitta-aggravating), pair it with something cooling.

interface AccompanimentRule {
  name: string
  when: string            // the condition that triggers this suggestion
  dosha_benefit: string
  reason_template: string // "{member_name}'s Pitta is balanced by..."
}

const DOSHA_ACCOMPANIMENTS: Record<Dosha, {
  aggravated_by: string[]
  balance_with: AccompanimentRule[]
}> = {
  pitta: {
    aggravated_by: ['spicy', 'sour', 'salty', 'fried', 'nightshades', 'fermented'],
    balance_with: [
      { name: 'Cooling cucumber raita',     when: 'spicy or fried main',       dosha_benefit: 'pitta_pacifying', reason_template: 'Cooling dairy neutralises Pitta heat' },
      { name: 'Fresh coconut chutney',      when: 'acidic or sour dish',       dosha_benefit: 'pitta_pacifying', reason_template: 'Coconut is sweet and cooling — reduces acidity' },
      { name: 'Mint-coriander chutney',     when: 'heavy protein meal',        dosha_benefit: 'pitta_pacifying', reason_template: 'Mint and coriander are Pitta\'s best cooling herbs' },
      { name: 'Cold buttermilk (chaas)',    when: 'summer or Greeshma season', dosha_benefit: 'pitta_pacifying', reason_template: 'Buttermilk cools the digestive tract in heat' },
      { name: 'Amla (Indian gooseberry)',   when: 'oily or rich meal',         dosha_benefit: 'pitta_pacifying', reason_template: 'Amla is sour but uniquely Pitta-pacifying' },
    ],
  },
  vata: {
    aggravated_by: ['dry', 'light', 'raw', 'cold', 'bitter', 'astringent'],
    balance_with: [
      { name: 'Warm ghee drizzle',          when: 'dry or light meal',         dosha_benefit: 'vata_pacifying', reason_template: 'Ghee is the best Vata-balancing fat — warm and unctuous' },
      { name: 'Sesame seed chutney',        when: 'raw salad or cold dish',    dosha_benefit: 'vata_pacifying', reason_template: 'Sesame is warming and grounding for Vata' },
      { name: 'Warm spiced milk with nutmeg', when: 'evening meal',            dosha_benefit: 'vata_pacifying', reason_template: 'Warm milk calms Vata\'s nervous energy before sleep' },
      { name: 'Ginger-lemon pickle',        when: 'heavy grain or legume dish', dosha_benefit: 'vata_pacifying', reason_template: 'Ginger fires up weak Vata digestion' },
      { name: 'Ajwain water',               when: 'beans or legumes',          dosha_benefit: 'vata_pacifying', reason_template: 'Ajwain prevents gas — Vata\'s biggest digestive issue with legumes' },
    ],
  },
  kapha: {
    aggravated_by: ['heavy', 'oily', 'sweet', 'dairy-heavy', 'cold', 'wheat-heavy'],
    balance_with: [
      { name: 'Light cumin-lemon water',    when: 'heavy or oily meal',        dosha_benefit: 'kapha_pacifying', reason_template: 'Cumin stimulates sluggish Kapha digestion' },
      { name: 'Ginger-honey tea',           when: 'sweet or dairy-heavy meal', dosha_benefit: 'kapha_pacifying', reason_template: 'Ginger + honey cuts through Kapha heaviness' },
      { name: 'Steamed bitter greens',      when: 'rich curry or dal',         dosha_benefit: 'kapha_pacifying', reason_template: 'Bitter greens are Kapha\'s best digestive aid' },
      { name: 'Dry roasted papad',          when: 'oily or fried side needed', dosha_benefit: 'kapha_pacifying', reason_template: 'Dry roasted replaces fried — lighter for Kapha' },
      { name: 'Tulsi-pepper tea',           when: 'cold or heavy breakfast',   dosha_benefit: 'kapha_pacifying', reason_template: 'Tulsi + pepper clears Kapha congestion and boosts metabolism' },
    ],
  },
  // Dual doshas — combine rules from both
  vata_pitta: {
    aggravated_by: ['dry', 'spicy', 'raw', 'cold', 'sour'],
    balance_with: [
      { name: 'Cooling cucumber raita',     when: 'spicy meal',                dosha_benefit: 'pitta_pacifying', reason_template: 'Addresses Pitta heat while staying moist for Vata' },
      { name: 'Warm ghee drizzle',          when: 'dry or light meal',         dosha_benefit: 'vata_pacifying',  reason_template: 'Ghee pacifies both Vata (dryness) and Pitta (inflammation)' },
    ],
  },
  pitta_kapha: {
    aggravated_by: ['spicy', 'heavy', 'oily', 'sweet', 'sour'],
    balance_with: [
      { name: 'Light cumin-coriander water', when: 'heavy or spicy meal',      dosha_benefit: 'pitta_kapha_pacifying', reason_template: 'Cumin eases Kapha, coriander cools Pitta' },
      { name: 'Steamed bitter greens',       when: 'rich meal',                dosha_benefit: 'kapha_pacifying',       reason_template: 'Cuts Kapha heaviness without aggravating Pitta' },
    ],
  },
  vata_kapha: {
    aggravated_by: ['dry', 'cold', 'heavy', 'raw'],
    balance_with: [
      { name: 'Warm ginger-sesame pickle',  when: 'any main meal',             dosha_benefit: 'vata_kapha_pacifying', reason_template: 'Warming for Vata, stimulating for Kapha' },
      { name: 'Ajwain water',               when: 'legume or grain dish',      dosha_benefit: 'vata_pacifying',       reason_template: 'Aids digestion for both sluggish Kapha and erratic Vata' },
    ],
  },
}

/**
 * Get accompaniment suggestions for a meal based on a member's dosha.
 * Returns up to 2 suggestions, ordered by relevance.
 */
export function getSuggestedAccompaniments(
  dosha: Dosha,
  mealDescription: string, // e.g. "Rajma — spicy, heavy, legume-based"
  memberName: string,
  limit = 2
): Accompaniment[] {
  const rules = DOSHA_ACCOMPANIMENTS[dosha]?.balance_with ?? []
  // Heuristic: pick first N rules (Gemini will make this smarter in production)
  return rules.slice(0, limit).map(rule => ({
    name: rule.name,
    reason: `${memberName}: ${rule.reason_template}`,
    dosha_benefit: rule.dosha_benefit,
    optional: true,
  }))
}

// ── 3. Dosha Quiz Scoring ──────────────────────
// The Prakriti quiz asks 8 questions.
// Each answer maps to a dosha score.
// The highest score wins.

export type DoshaQuizAnswer = 'vata' | 'pitta' | 'kapha'

export interface DoshaQuizQuestion {
  id: number
  question: string
  answers: { label: string; dosha: DoshaQuizAnswer }[]
}

export const PRAKRITI_QUIZ: DoshaQuizQuestion[] = [
  {
    id: 1,
    question: 'How is your digestion usually?',
    answers: [
      { label: 'Variable — sometimes fine, sometimes gassy or irregular', dosha: 'vata' },
      { label: 'Strong and sharp — I get very hungry and irritable if I skip meals', dosha: 'pitta' },
      { label: 'Slow but steady — I rarely feel very hungry', dosha: 'kapha' },
    ],
  },
  {
    id: 2,
    question: 'How would you describe your body frame?',
    answers: [
      { label: 'Thin, light — hard to gain weight', dosha: 'vata' },
      { label: 'Medium, athletic — moderate build', dosha: 'pitta' },
      { label: 'Broad, sturdy — gain weight easily', dosha: 'kapha' },
    ],
  },
  {
    id: 3,
    question: 'What is your skin like?',
    answers: [
      { label: 'Dry, rough, or thin — gets flaky in winter', dosha: 'vata' },
      { label: 'Oily, warm, prone to acne or rashes', dosha: 'pitta' },
      { label: 'Thick, smooth, oily — good complexion', dosha: 'kapha' },
    ],
  },
  {
    id: 4,
    question: 'How do you handle stress?',
    answers: [
      { label: 'I get anxious, worried, and scattered', dosha: 'vata' },
      { label: 'I get irritable, intense, or angry', dosha: 'pitta' },
      { label: 'I stay calm — it takes a lot to upset me', dosha: 'kapha' },
    ],
  },
  {
    id: 5,
    question: 'How is your energy through the day?',
    answers: [
      { label: 'Variable — bursts of energy then crashes', dosha: 'vata' },
      { label: 'Strong and consistent — especially in the morning', dosha: 'pitta' },
      { label: 'Slow to start but steady once going', dosha: 'kapha' },
    ],
  },
  {
    id: 6,
    question: 'How is your sleep?',
    answers: [
      { label: 'Light and interrupted — hard to fall or stay asleep', dosha: 'vata' },
      { label: 'Moderate — 6–7 hours, wake up easily', dosha: 'pitta' },
      { label: 'Deep and long — hard to wake up, could sleep forever', dosha: 'kapha' },
    ],
  },
  {
    id: 7,
    question: 'How do you speak and think?',
    answers: [
      { label: 'Fast, lots of ideas, jump between topics', dosha: 'vata' },
      { label: 'Sharp, focused, direct — I like debates', dosha: 'pitta' },
      { label: 'Slow and thoughtful — I think before I speak', dosha: 'kapha' },
    ],
  },
  {
    id: 8,
    question: 'What foods do you naturally crave?',
    answers: [
      { label: 'Warm, salty, or crunchy snacks', dosha: 'vata' },
      { label: 'Cooling, spicy, or sour foods', dosha: 'pitta' },
      { label: 'Sweet, heavy, or comfort foods', dosha: 'kapha' },
    ],
  },
]

/**
 * Score a set of quiz answers and return the suggested dosha.
 * answers is an array of 8 DoshaQuizAnswer values (one per question).
 */
export function scoreDoshaQuiz(answers: DoshaQuizAnswer[]): Dosha {
  const scores = { vata: 0, pitta: 0, kapha: 0 }
  answers.forEach(a => scores[a]++)

  const sorted = (Object.entries(scores) as [DoshaQuizAnswer, number][])
    .sort((a, b) => b[1] - a[1])

  const [first, second] = sorted
  // If top two are within 1 point, it's a dual dosha
  if (first[1] - second[1] <= 1) {
    const combo = [first[0], second[0]].sort().join('_')
    return combo as Dosha
  }
  return first[0] as Dosha
}

// Export season info for use in other modules
export { SEASONS, type SeasonInfo }
