'use client';

import { useState } from 'react';
import { PRAKRITI_QUIZ, scoreDoshaQuiz } from '@/domain/ayurveda';
import type { WizardMemberDraft, Dosha } from '@/types';

const DOSHA_INFO: Record<Dosha, { label: string; emoji: string; description: string; color: string }> = {
  vata: { label: 'Vata', emoji: '🌬️', description: 'Air & Space — Creative, quick, tends toward dryness and anxiety', color: '#7B9EC4' },
  pitta: { label: 'Pitta', emoji: '🔥', description: 'Fire & Water — Ambitious, sharp, tends toward heat and inflammation', color: '#E8793A' },
  kapha: { label: 'Kapha', emoji: '🌊', description: 'Water & Earth — Steady, nurturing, tends toward weight gain and sluggishness', color: '#4A7C59' },
  vata_pitta: { label: 'Vata-Pitta', emoji: '🌬️🔥', description: 'Dual constitution of Air and Fire', color: '#9B72CF' },
  pitta_kapha: { label: 'Pitta-Kapha', emoji: '🔥🌊', description: 'Dual constitution of Fire and Water-Earth', color: '#C2546E' },
  vata_kapha: { label: 'Vata-Kapha', emoji: '🌬️🌊', description: 'Dual constitution of Air and Water-Earth', color: '#5B8DD9' },
};

interface QuizState {
  [questionIndex: number]: number; // answer index
}

function DoshaQuiz({ onComplete }: { onComplete: (dosha: Dosha) => void }) {
  const [answers, setAnswers] = useState<QuizState>({});
  const [currentQ, setCurrentQ] = useState(0);

  const handleAnswer = (questionIdx: number, answerIdx: number) => {
    const newAnswers = { ...answers, [questionIdx]: answerIdx };
    setAnswers(newAnswers);

    if (questionIdx < PRAKRITI_QUIZ.length - 1) {
      setTimeout(() => setCurrentQ(questionIdx + 1), 300);
    } else {
      // All answered — calculate
      const answerArray = PRAKRITI_QUIZ.map((_, i) => newAnswers[i] ?? 0);
      const dosha = scoreDoshaQuiz(answerArray);
      onComplete(dosha);
    }
  };

  const progress = Object.keys(answers).length;
  const pct = Math.round((progress / PRAKRITI_QUIZ.length) * 100);

  return (
    <div>
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Question {Math.min(currentQ + 1, PRAKRITI_QUIZ.length)} of {PRAKRITI_QUIZ.length}</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#E8793A' }} />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#FDF6EC', border: '1.5px solid #F5E9D6' }}>
        <p className="font-semibold text-charcoal text-sm mb-4">{PRAKRITI_QUIZ[currentQ].question}</p>
        <div className="space-y-2">
          {PRAKRITI_QUIZ[currentQ].answers.map((ans, i) => (
            <button key={i}
              onClick={() => handleAnswer(currentQ, i)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all hover:shadow-sm"
              style={{
                border: answers[currentQ] === i ? '1.5px solid #E8793A' : '1.5px solid #F5E9D6',
                background: answers[currentQ] === i ? '#FEF0E6' : 'white',
                color: answers[currentQ] === i ? '#E8793A' : '#2C2416',
              }}>
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              {ans.text}
              <span className="text-xs text-gray-400 ml-2">({ans.dosha})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button
          disabled={currentQ === 0}
          onClick={() => setCurrentQ(q => q - 1)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-all">
          ← Back
        </button>
        {answers[currentQ] !== undefined && currentQ < PRAKRITI_QUIZ.length - 1 && (
          <button onClick={() => setCurrentQ(q => q + 1)}
            className="px-4 py-2 text-sm font-medium" style={{ color: '#E8793A' }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  members: WizardMemberDraft[];
  onChange: (members: WizardMemberDraft[]) => void;
}

export default function StepDosha({ members, onChange }: Props) {
  const [quizFor, setQuizFor] = useState<string | null>(null);

  const setDosha = (id: string, dosha: Dosha) => {
    onChange(members.map(m => m.id === id ? { ...m, dosha } : m));
    setQuizFor(null);
  };

  if (quizFor) {
    const member = members.find(m => m.id === quizFor);
    return (
      <div>
        <button onClick={() => setQuizFor(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
          ← Back to all members
        </button>
        <h2 className="text-xl font-bold text-charcoal mb-1">Prakriti Quiz for {member?.name}</h2>
        <p className="text-sm text-gray-500 mb-4">Answer based on your natural tendencies, not current state.</p>
        <DoshaQuiz onComplete={dosha => setDosha(quizFor, dosha)} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-charcoal mb-1">Ayurvedic Body Type (Dosha)</h2>
      <p className="text-sm text-gray-500 mb-6">
        Select each person's dosha if you know it, or take our quick 8-question Prakriti quiz to find out.
      </p>

      <div className="space-y-4">
        {members.map(member => (
          <div key={member.id} className="rounded-2xl p-4" style={{ background: '#FDF6EC', border: '1.5px solid #F5E9D6' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-charcoal text-sm">{member.name || 'Member'}</span>
              {member.dosha && (
                <button onClick={() => onChange(members.map(m => m.id === member.id ? { ...m, dosha: undefined } : m))}
                  className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
              )}
            </div>

            {member.dosha ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: DOSHA_INFO[member.dosha].color + '18', border: `1.5px solid ${DOSHA_INFO[member.dosha].color}40` }}>
                <span className="text-xl">{DOSHA_INFO[member.dosha].emoji}</span>
                <div>
                  <div className="font-semibold text-sm" style={{ color: DOSHA_INFO[member.dosha].color }}>
                    {DOSHA_INFO[member.dosha].label}
                  </div>
                  <div className="text-xs text-gray-500">{DOSHA_INFO[member.dosha].description}</div>
                </div>
              </div>
            ) : (
              <>
                {/* Direct selection */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(Object.entries(DOSHA_INFO) as [Dosha, typeof DOSHA_INFO[Dosha]][]).map(([key, info]) => (
                    <button key={key}
                      onClick={() => setDosha(member.id, key)}
                      className="px-3 py-1.5 rounded-pill text-xs font-medium transition-all hover:shadow-sm"
                      style={{ borderRadius: '50px', border: `1.5px solid ${info.color}60`, color: info.color, background: info.color + '12' }}>
                      {info.emoji} {info.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setQuizFor(member.id)}
                  className="w-full py-2 rounded-xl text-xs font-medium text-center transition-colors hover:bg-amber-50"
                  style={{ border: '1.5px dashed #E8793A', color: '#E8793A' }}>
                  🧘 Take Prakriti Quiz for {member.name || 'this member'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Not sure? You can skip this — Gemini will use a balanced approach.
      </p>
    </div>
  );
}
