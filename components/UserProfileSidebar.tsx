'use client';

import { EnergyTrait, Vibe } from '@/lib/types';
import { getTraitEmoji, getVibeEmoji } from '@/lib/vibes';
import type { NearbyUser } from './MapView';

type UserProfileSidebarProps = {
  user: NearbyUser | null;
  onClose: () => void;
  onResonate: (moodId: string) => Promise<void>;
};

const VIBE_BADGE_CLASSES: Record<Vibe, string> = {
  flirty: 'bg-pink-500/20 text-pink-300 border border-pink-500/40',
  playful: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  calm: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  curious: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
  venting: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  bored: 'bg-slate-500/20 text-slate-300 border border-slate-500/40',
  chaotic: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
};

export default function UserProfileSidebar({ user, onClose, onResonate }: UserProfileSidebarProps) {
  const isOpen = user !== null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 z-[2000] bg-vibe-900 shadow-2xl border-l border-vibe-700 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {user && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-vibe-700">
            <h2 className="text-lg font-bold text-vibe-100">
              {user.first_name}, {user.age}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close profile"
              className="text-vibe-400 hover:text-vibe-100 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Location info */}
            <div className="text-sm text-vibe-300 space-y-1">
              <p>📍 {user.city}</p>
              <p>📏 {user.distance_km} km away</p>
            </div>

            {/* Vibe badge */}
            {user.vibe && (
              <div>
                <p className="text-xs text-vibe-400 uppercase tracking-wide mb-2">Current vibe</p>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    VIBE_BADGE_CLASSES[user.vibe]
                  }`}
                >
                  {getVibeEmoji(user.vibe)} {user.vibe}
                </span>
              </div>
            )}

            {/* Latest mood */}
            {user.mood_text && (
              <div>
                <p className="text-xs text-vibe-400 uppercase tracking-wide mb-2">Latest mood</p>
                <p className="text-vibe-200 italic text-sm leading-relaxed">
                  &ldquo;{user.mood_text}&rdquo;
                </p>
              </div>
            )}

            {/* Energy traits */}
            {user.energy_traits && user.energy_traits.length > 0 && (
              <div>
                <p className="text-xs text-vibe-400 uppercase tracking-wide mb-2">Energy</p>
                <div className="flex flex-wrap gap-2">
                  {user.energy_traits.map((trait) => (
                    <span
                      key={trait}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-vibe-800 text-vibe-200 text-xs border border-vibe-700"
                    >
                      {getTraitEmoji(trait as EnergyTrait)} {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-vibe-700 space-y-2">
            {user.mood_id && (
              <button
                onClick={() => onResonate(user.mood_id!)}
                className="btn btn-primary w-full"
              >
                Resonate with Vibe ✨
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary w-full">
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
