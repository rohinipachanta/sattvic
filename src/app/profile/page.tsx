'use client';
export const dynamic = 'force-dynamic';
;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { calcAllProteinTargets } from '@/domain/protein';
import type { FamilyMember, ProteinTarget } from '@/types';

const DOSHA_DISPLAY: Record<string, { label: string; emoji: string; color: string }> = {
  vata: { label: 'Vata', emoji: '🌬️', color: '#7B9EC4' },
  pitta: { label: 'Pitta', emoji: '🔥', color: '#E8793A' },
  kapha: { label: 'Kapha', emoji: '🌊', color: '#4A7C59' },
  vata_pitta: { label: 'Vata-Pitta', emoji: '🌬️🔥', color: '#9B72CF' },
  pitta_kapha: { label: 'Pitta-Kapha', emoji: '🔥🌊', color: '#C2546E' },
  vata_kapha: { label: 'Vata-Kapha', emoji: '🌬️🌊', color: '#5B8DD9' },
};

const CONDITION_LABELS: Record<string, string> = {
  diabetes: 'Diabetes', hypertension: 'Hypertension', pcos: 'PCOS',
  thyroid: 'Thyroid', anaemia: 'Anaemia', ibs: 'IBS',
  pregnancy: 'Pregnancy', heart_disease: 'Heart Disease',
  kidney_disease: 'Kidney Issues', lactose_intolerant: 'Lactose Intolerant',
  gluten_intolerant: 'Gluten Intolerant', nut_allergy: 'Nut Allergy',
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss', weight_gain: 'Weight Gain',
  energy: 'Energy & Vitality', gut_health: 'Gut Health',
  hormonal_balance: 'Hormonal Balance', muscle_gain: 'Muscle Gain',
  diabetes_management: 'Blood Sugar Control', heart_health: 'Heart Health',
};

function getAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function MemberCard({ member, target }: { member: FamilyMember; target: ProteinTarget | undefined }) {
  const dosha = member.dosha ? DOSHA_DISPLAY[member.dosha] : null;
  const age = member.date_of_birth ? getAge(member.date_of_birth) : null;

  return (
    <div className="rounded-2xl p-5" style={{ background: '#FDF6EC', border: '1.5px solid #F5E9D6' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-charcoal">{member.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            {age !== null && <span>{age} yrs</span>}
            {member.weight_kg && <span>· {member.weight_kg} kg</span>}
            {member.height_cm && <span>· {member.height_cm} cm</span>}
            <span>· <span className="capitalize">{member.dietary_preference?.replace(/_/g, ' ')}</span></span>
          </div>
        </div>
        {dosha && (
          <div className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: dosha.color + '18', color: dosha.color, border: `1px solid ${dosha.color}40` }}>
            {dosha.emoji} {dosha.label}
          </div>
        )}
      </div>

      {/* Protein target */}
      {target && (
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#EEF4FF', border: '1px solid #BCD0F5' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: '#5B8DD9' }}>💪 Daily Protein Target</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: '#5B8DD9' }}>{target.target_g}g</span>
            <span className="text-xs text-gray-400">per day ({target.multiplier}g/kg · {target.rationale})</span>
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</span>
        <span className="ml-2 text-sm capitalize text-charcoal">{member.activity_level?.replace(/_/g, ' ')}</span>
      </div>

      {/* Health conditions */}
      {member.health_conditions && member.health_conditions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Health Conditions</p>
          <div className="flex flex-wrap gap-1.5">
            {member.health_conditions.map(c => (
              <span key={c} className="px-2 py-0.5 rounded-full text-xs text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                {CONDITION_LABELS[c] ?? c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Health goals */}
      {member.health_goals && member.health_goals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Goals</p>
          <div className="flex flex-wrap gap-1.5">
            {member.health_goals.map(g => (
              <span key={g} className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: '#FEF0E6', border: '1px solid #FDDCB9', color: '#C25E1A' }}>
                {GOAL_LABELS[g] ?? g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [targets, setTargets] = useState<ProteinTarget[]>([]);
  const [fastingTypes, setFastingTypes] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? '');

      const { data: mems } = await supabase
        .from('family_members').select('*').eq('user_id', user.id).order('created_at');
      const memberList = (mems ?? []) as FamilyMember[];
      setMembers(memberList);
      setTargets(calcAllProteinTargets(memberList).filter(Boolean) as ProteinTarget[]);

      const { data: fasting } = await supabase
        .from('fasting_preferences').select('fasting_types').eq('user_id', user.id).single();
      setFastingTypes(fasting?.fasting_types ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFDF8' }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌿</div>
          <p className="text-gray-400 text-sm">Loading profiles…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FFFDF8' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-amber-100"
        style={{ background: 'rgba(255,253,248,0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/home" className="text-gray-400 hover:text-gray-600 mr-1">←</a>
            <span className="text-xl">🌿</span>
            <span className="font-bold" style={{ color: '#E8793A' }}>Sattvic</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{userEmail}</span>
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Family Profiles</h1>
            <p className="text-sm text-gray-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => router.push('/setup')}
            className="px-4 py-2 rounded-pill text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#E8793A', borderRadius: '50px' }}>
            ✏️ Edit Profiles
          </button>
        </div>

        {/* Member cards */}
        <div className="space-y-4 mb-6">
          {members.map(member => {
            const target = targets.find(t => t.member_id === member.id);
            return <MemberCard key={member.id} member={member} target={target} />;
          })}
        </div>

        {/* Fasting section */}
        {fastingTypes.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#F3EAF7', border: '1.5px solid #9B6BB5' }}>
            <h3 className="font-semibold text-purple-800 text-sm mb-3">🙏 Fasting Observances</h3>
            <div className="flex flex-wrap gap-2">
              {fastingTypes.map(ft => (
                <span key={ft} className="px-3 py-1 rounded-full text-xs font-medium text-purple-700"
                  style={{ background: 'rgba(155,107,181,0.15)', border: '1px solid #9B6BB5' }}>
                  {ft.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/home"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-pill text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#E8793A', borderRadius: '50px' }}>
            ← Back to Meal Planner
          </a>
        </div>
      </main>
    </div>
  );
}
