'use client';

import { useState } from 'react';
import { Vibe, EnergyTrait } from '@/lib/types';
import type { NearbyUser } from './MapView';

const VIBE_EMOJI: Record<Vibe, string> = {
  flirty: '🔥',
  playful: '😄',
  calm: '😌',
  curious: '🤔',
  venting: '😤',
  bored: '😑',
  chaotic: '🌪️',
};

const TRAIT_COLORS: Record<EnergyTrait, string> = {
  calm: 'bg-emerald-900 text-emerald-200',
  funny: 'bg-yellow-900 text-yellow-200',
  direct: 'bg-blue-900 text-blue-200',
  'low-key': 'bg-slate-800 text-slate-300',
  intense: 'bg-red-900 text-red-200',
  creative: 'bg-purple-900 text-purple-200',
  chill: 'bg-teal-900 text-teal-200',
  driven: 'bg-orange-900 text-orange-200',
};

type UserProfileSidebarProps = {
  user: NearbyUser | null;
  token: string;
  onClose: () => void;
};

export default function UserProfileSidebar({ user, token, onClose }: UserProfileSidebarProps) {
  const [resonating, setResonating] = useState(false);
  const [resonated, setResonated] = useState(false);
  const [error, setError] = useState('');

  const handleResonate = async () => {
    if (!user?.mood_id) return;
    try {
      setResonating(true);
      setError('');
      const res = await fetch('/api/resonates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ mood_id: user.mood_id }),
      });
      const data = await res.json() as { error?: string; matched?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'Unable to resonate');
      } else {
        setResonated(true);
        if (data.matched) {
          setError(''); // clear any prior error
        }
      }
    } catch {
      setError('Unable to resonate right now');
    } finally {
      setResonating(false);
    }
  };

  const isOpen = user !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-[2000] h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="User profile"
      >
        {user && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">
                {user.first_name}{user.age ? `, ${user.age}` : ''}
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-100 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* City + distance */}
              <div className="flex items-center gap-3 text-sm text-slate-400">
                {user.city && <span>📍 {user.city}</span>}
                <span>· {user.distance_km.toFixed(1)} km away</span>
              </div>

              {/* Vibe */}
              {user.vibe && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{VIBE_EMOJI[user.vibe]}</span>
                  <span className="text-slate-200 font-medium capitalize">{user.vibe}</span>
                </div>
              )}

              {/* Energy traits */}
              {user.energy_traits?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Energy traits</p>
                  <div className="flex flex-wrap gap-2">
                    {user.energy_traits.map((trait) => (
                      <span
                        key={trait}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${TRAIT_COLORS[trait as EnergyTrait] ?? 'bg-slate-800 text-slate-300'}`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest mood */}
              {user.mood_text && (
                <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Current mood</p>
                  <p className="text-slate-200 italic text-sm">&ldquo;{user.mood_text}&rdquo;</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-800 space-y-2">
              {user.mood_id && (
                <button
                  onClick={() => { void handleResonate(); }}
                  disabled={resonating || resonated}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors
                    bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resonated ? '✓ Resonated!' : resonating ? 'Resonating…' : 'Resonate with Vibe'}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-semibold text-sm
                  bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
