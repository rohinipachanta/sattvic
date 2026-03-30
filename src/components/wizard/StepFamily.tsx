'use client';

import { useState } from 'react';
import type { WizardMemberDraft, ActivityLevel, DietaryPreference } from '@/types';

const DIETARY_OPTIONS: { value: DietaryPreference; label: string; emoji: string }[] = [
  { value: 'vegetarian',     label: 'Vegetarian',    emoji: '🥦' },
  { value: 'vegan',          label: 'Vegan',          emoji: '🌱' },
  { value: 'eggetarian',     label: 'Eggetarian',     emoji: '🥚' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian', emoji: '🍗' },
  { value: 'jain',           label: 'Jain',           emoji: '🕊️' },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',   description: 'Desk job, little movement' },
  { value: 'light',       label: 'Light',       description: 'Light walks, casual activity' },
  { value: 'moderate',    label: 'Moderate',    description: '3–5 days exercise per week' },
  { value: 'active',      label: 'Active',      description: '6–7 days intense exercise' },
  { value: 'very_active', label: 'Very Active', description: 'Athlete / physical job' },
];

// ── Conversions ───────────────────────────────────────────────────────────────
const kgToLb   = (kg: number) => Math.round(kg * 2.20462);
const lbToKg   = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;
const cmToFt   = (cm: number) => Math.floor(cm / 30.48);
const cmToIn   = (cm: number) => Math.round((cm % 30.48) / 2.54);
const ftInToCm = (ft: number, inch: number) =>
  Math.round((ft * 30.48 + inch * 2.54) * 10) / 10;

type UnitSystem = 'metric' | 'imperial';

// Per-member imperial display state (what the user is currently typing)
interface ImperialDraft { lb: string; ft: string; inch: string }

interface Props {
  members: WizardMemberDraft[];
  onChange: (members: WizardMemberDraft[]) => void;
}

function blankMember(): WizardMemberDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    dob: '',
    weight_kg:  undefined,
    height_cm:  undefined,
    dietary_preference: 'vegetarian',
    activity_level:     'moderate',
    dosha:              undefined,
    health_conditions:  [],
    health_goals:       [],
    cuisines:           [],
  };
}

const BOX = { border: '1.5px solid #F5E9D6' } as const;

export default function StepFamily({ members, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(members[0]?.id ?? null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  // Draft strings for imperial inputs — keyed by member id
  // This lets the user type freely without mid-keystroke conversion
  const [imp, setImp] = useState<Record<string, ImperialDraft>>({});

  const getDraft = (id: string): ImperialDraft =>
    imp[id] ?? { lb: '', ft: '', inch: '' };

  const setDraft = (id: string, patch: Partial<ImperialDraft>) =>
    setImp(prev => ({ ...prev, [id]: { ...getDraft(id), ...patch } }));

  // When switching to imperial, seed draft values from stored metric
  const switchToImperial = () => {
    const seeds: Record<string, ImperialDraft> = {};
    members.forEach(m => {
      seeds[m.id] = {
        lb:   m.weight_kg != null ? String(kgToLb(m.weight_kg)) : '',
        ft:   m.height_cm != null ? String(cmToFt(m.height_cm)) : '',
        inch: m.height_cm != null ? String(cmToIn(m.height_cm)) : '',
      };
    });
    setImp(seeds);
    setUnitSystem('imperial');
  };

  const addMember = () => {
    const m = blankMember();
    onChange([...members, m]);
    setExpandedId(m.id);
  };

  const removeMember = (id: string) => {
    onChange(members.filter(m => m.id !== id));
  };

  const updateMember = (id: string, patch: Partial<WizardMemberDraft>) =>
    onChange(members.map(m => m.id === id ? { ...m, ...patch } : m));

  return (
    <div>
      {/* Header + unit toggle */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-bold text-charcoal">Who's in your family?</h2>
        <div className="flex items-center rounded-full p-0.5 text-xs font-semibold"
          style={{ background: '#F5E9D6' }}>
          <button onClick={() => setUnitSystem('metric')}
            className="px-3 py-1 rounded-full transition-all"
            style={{
              background: unitSystem === 'metric' ? '#E8793A' : 'transparent',
              color:      unitSystem === 'metric' ? '#fff' : '#6B5B45',
            }}>
            kg / cm
          </button>
          <button onClick={switchToImperial}
            className="px-3 py-1 rounded-full transition-all"
            style={{
              background: unitSystem === 'imperial' ? '#E8793A' : 'transparent',
              color:      unitSystem === 'imperial' ? '#fff' : '#6B5B45',
            }}>
            lb / ft
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">Add each family member so we can personalise meals for everyone.</p>

      <div className="space-y-3">
        {members.map((member, idx) => (
          <div key={member.id} className="rounded-2xl overflow-hidden"
            style={{
              border:     expandedId === member.id ? '2px solid #E8793A' : '1.5px solid #F5E9D6',
              background: '#FDF6EC',
            }}>

            {/* Collapsed header */}
            <button className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: '#E8793A' }}>{idx + 1}</span>
                <div>
                  <div className="font-semibold text-charcoal text-sm">
                    {member.name || `Family Member ${idx + 1}`}
                  </div>
                  {member.dob && (
                    <div className="text-xs text-gray-400">
                      {new Date().getFullYear() - new Date(member.dob).getFullYear()} yrs · {member.dietary_preference}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {members.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeMember(member.id); }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                )}
                <span className="text-gray-400 text-sm">{expandedId === member.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded form */}
            {expandedId === member.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-amber-100">

                {/* Name + DOB */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input type="text" placeholder="e.g. Amma"
                      value={member.name}
                      onChange={e => updateMember(member.id, { name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron"
                      style={BOX} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth *</label>
                    <input type="date"
                      value={member.dob}
                      onChange={e => updateMember(member.id, { dob: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none"
                      style={BOX} />
                  </div>
                </div>

                {/* Weight + Height */}
                <div className="grid grid-cols-2 gap-3">

                  {/* ── WEIGHT ── */}
                  {unitSystem === 'metric' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                      <input type="number" placeholder="e.g. 65" min={5} max={300}
                        value={member.weight_kg ?? ''}
                        onChange={e => updateMember(member.id, {
                          weight_kg: e.target.value ? +e.target.value : undefined,
                        })}
                        className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron"
                        style={BOX} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lb)</label>
                      {/* Use draft string so user can type freely; convert only on blur */}
                      <input type="number" placeholder="e.g. 143" min={10} max={660}
                        value={getDraft(member.id).lb}
                        onChange={e => setDraft(member.id, { lb: e.target.value })}
                        onBlur={e => {
                          const lb = parseFloat(e.target.value);
                          updateMember(member.id, {
                            weight_kg: isNaN(lb) ? undefined : lbToKg(lb),
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron"
                        style={BOX} />
                    </div>
                  )}

                  {/* ── HEIGHT ── */}
                  {unitSystem === 'metric' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
                      <input type="number" placeholder="e.g. 165" min={50} max={250}
                        value={member.height_cm ?? ''}
                        onChange={e => updateMember(member.id, {
                          height_cm: e.target.value ? +e.target.value : undefined,
                        })}
                        className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron"
                        style={BOX} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Height (ft / in)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type="number" placeholder="5" min={1} max={8}
                            value={getDraft(member.id).ft}
                            onChange={e => setDraft(member.id, { ft: e.target.value })}
                            onBlur={e => {
                              const ft   = parseFloat(e.target.value) || 0;
                              const inch = parseFloat(getDraft(member.id).inch) || 0;
                              if (ft || inch) updateMember(member.id, { height_cm: ftInToCm(ft, inch) });
                            }}
                            className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron pr-7"
                            style={BOX} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <input type="number" placeholder="6" min={0} max={11}
                            value={getDraft(member.id).inch}
                            onChange={e => setDraft(member.id, { inch: e.target.value })}
                            onBlur={e => {
                              const inch = parseFloat(e.target.value) || 0;
                              const ft   = parseFloat(getDraft(member.id).ft) || 0;
                              if (ft || inch) updateMember(member.id, { height_cm: ftInToCm(ft, inch) });
                            }}
                            className="w-full px-3 py-2 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-saffron pr-7"
                            style={BOX} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">in</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dietary preference */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Dietary Preference *</label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => updateMember(member.id, { dietary_preference: opt.value })}
                        className="px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          borderRadius: '50px',
                          border:       member.dietary_preference === opt.value ? '1.5px solid #E8793A' : '1.5px solid #F5E9D6',
                          background:   member.dietary_preference === opt.value ? '#FEF0E6' : 'white',
                          color:        member.dietary_preference === opt.value ? '#E8793A' : '#555',
                        }}>
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity level */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Activity Level</label>
                  <div className="space-y-1.5">
                    {ACTIVITY_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => updateMember(member.id, { activity_level: opt.value })}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all"
                        style={{
                          border:     member.activity_level === opt.value ? '1.5px solid #E8793A' : '1.5px solid #F5E9D6',
                          background: member.activity_level === opt.value ? '#FEF0E6' : 'white',
                        }}>
                        <span className="text-sm font-medium"
                          style={{ color: member.activity_level === opt.value ? '#E8793A' : '#2C2416' }}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-400">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addMember}
        className="mt-4 w-full py-3 rounded-2xl text-sm font-medium transition-colors hover:bg-amber-50"
        style={{ border: '1.5px dashed #E8793A', color: '#E8793A' }}>
        + Add Family Member
      </button>
    </div>
  );
}
