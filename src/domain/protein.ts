// ─────────────────────────────────────────────
// Sattvic — Protein Target Calculator
// ─────────────────────────────────────────────
// Think of this like a personalised fuel gauge.
// Just like a car needs different amounts of fuel
// depending on engine size and driving style,
// each person needs a different amount of protein
// based on their body weight, health, and activity.
//
// All the logic lives here — pure functions,
// no database, no UI. Easy to test, easy to change.

import type { FamilyMember, ProteinTarget, HealthCondition, ActivityLevel } from '@/types'
import { differenceInYears, parseISO } from 'date-fns'

// ── Multiplier rules (g of protein per kg of body weight) ──
// Higher number = more protein needed

const BASE_MULTIPLIER = 0.8  // WHO minimum for standard adults

function getMultiplier(
  conditions: HealthCondition[],
  activity: ActivityLevel,
  ageYears: number
): { multiplier: number; rationale: string } {
  let multiplier = BASE_MULTIPLIER
  const reasons: string[] = []

  // Age-based rules
  if (ageYears < 15) {
    multiplier = Math.max(multiplier, 1.1)
    reasons.push('growing child (1.1g/kg)')
  } else if (ageYears > 65) {
    multiplier = Math.max(multiplier, 1.0)
    reasons.push('older adult (1.0g/kg — muscle preservation)')
  }

  // Health condition rules
  if (conditions.includes('diabetes_type1') || conditions.includes('diabetes_type2')) {
    multiplier = Math.max(multiplier, 1.4)
    reasons.push('diabetes management (1.4g/kg — improves glycaemic control)')
  }
  if (conditions.includes('pcos')) {
    multiplier = Math.max(multiplier, 1.3)
    reasons.push('PCOS (1.3g/kg — supports hormonal balance)')
  }
  if (conditions.includes('weight_management')) {
    multiplier = Math.max(multiplier, 1.4)
    reasons.push('weight management (1.4g/kg — reduces hunger, preserves muscle)')
  }
  if (conditions.includes('anaemia')) {
    multiplier = Math.max(multiplier, 1.2)
    reasons.push('anaemia (1.2g/kg — supports haemoglobin production)')
  }
  if (conditions.includes('hypothyroidism') || conditions.includes('hyperthyroidism')) {
    multiplier = Math.max(multiplier, 1.2)
    reasons.push('thyroid condition (1.2g/kg — supports metabolism)')
  }

  // Activity level rules
  if (activity === 'moderate') {
    multiplier = Math.max(multiplier, 1.2)
    if (!reasons.some(r => r.includes('1.2') || parseFloat(r) > 1.2))
      reasons.push('moderately active (1.2g/kg)')
  }
  if (activity === 'active') {
    multiplier = Math.max(multiplier, 1.6)
    reasons.push('highly active (1.6g/kg — supports muscle repair)')
  }

  // Default if no special conditions
  if (reasons.length === 0) {
    reasons.push('standard adult (0.8g/kg — WHO minimum)')
  }

  return {
    multiplier,
    rationale: reasons.join(' · ')
  }
}

/**
 * Calculate the daily protein target for a family member.
 * Returns null if no weight is set (prompts user to add weight).
 */
export function calcProteinTarget(member: FamilyMember): ProteinTarget | null {
  if (!member.weight_kg) return null

  const ageYears = differenceInYears(new Date(), parseISO(member.date_of_birth))
  const { multiplier, rationale } = getMultiplier(
    member.health_conditions,
    member.activity_level,
    ageYears
  )

  const target_g = Math.round(member.weight_kg * multiplier)

  return {
    member_id:   member.id,
    member_name: member.name,
    target_g,
    multiplier,
    rationale,
    weight_kg:   member.weight_kg,
  }
}

/**
 * Calculate protein targets for all family members.
 * Members without weight return null (shown as "add weight" prompt in UI).
 */
export function calcAllProteinTargets(
  members: FamilyMember[]
): (ProteinTarget | null)[] {
  return members.map(calcProteinTarget)
}

/**
 * Given a meal's protein content and a member's daily target,
 * return what percentage of the daily goal this meal covers.
 */
export function proteinProgressPercent(
  mealProtein: number,
  dailyAchieved: number,
  dailyTarget: number
): number {
  if (dailyTarget === 0) return 0
  return Math.min(100, Math.round((dailyAchieved / dailyTarget) * 100))
}

/**
 * On fasting days, check if the planned meals meet the protein target.
 * Returns a gap warning if more than 20g short.
 */
export function fastingProteinGapWarning(
  fastingDayProtein: number,
  target: ProteinTarget
): string | null {
  const gap = target.target_g - fastingDayProtein
  if (gap > 20) {
    return `${target.member_name} is ${gap}g short of their protein target today. ` +
           `Add paneer, curd, peanuts, or milk to close the gap.`
  }
  return null
}
