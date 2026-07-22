'use client';

import { Mood, Vibe } from '@/lib/types';

const vibeMarkerClasses: Record<Vibe, string> = {
  flirty: 'bg-pink-500 text-white',
  bored: 'bg-slate-500 text-white',
  curious: 'bg-cyan-500 text-white',
  venting: 'bg-orange-500 text-white',
  playful: 'bg-yellow-400 text-vibe-950',
  calm: 'bg-emerald-500 text-white',
  chaotic: 'bg-purple-500 text-white',
};

// Keep markers inside the visible ring while still using most of the card for relative distance.
const MAX_MAP_OFFSET_PERCENT = 42;

type NearbyMoodMapProps = {
  moods: Mood[];
  radiusKm: number;
  activeMoodId?: string;
  onSelect: (moodId: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function NearbyMoodMap({
  moods,
  radiusKm,
  activeMoodId,
  onSelect,
}: NearbyMoodMapProps) {
  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-vibe-100">Nearby mood map</h3>
          <p className="text-sm text-vibe-400">You are centered. Pins show who is nearby within {radiusKm} km.</p>
        </div>
        <span className="badge">{moods.length} nearby</span>
      </div>

      <div className="relative h-80 overflow-hidden rounded-2xl border border-vibe-700 bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.22),_rgba(15,23,42,0.9)_35%,_rgba(2,6,23,1)_100%)]">
        <div className="absolute inset-6 rounded-full border border-vibe-700/60" />
        <div className="absolute inset-14 rounded-full border border-vibe-700/50" />
        <div className="absolute inset-24 rounded-full border border-vibe-700/40" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-vibe-700/40" />
        <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-vibe-700/40" />

        <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-vibe-950 bg-vibe-300 text-xs font-bold text-vibe-950 shadow-lg shadow-vibe-950/50">
          You
        </div>

        {moods.map((mood) => {
          const relativeX = mood.relative_x ?? 0;
          const relativeY = mood.relative_y ?? 0;
          const left =
            50 +
            clamp(
              (relativeX / radiusKm) * MAX_MAP_OFFSET_PERCENT,
              -MAX_MAP_OFFSET_PERCENT,
              MAX_MAP_OFFSET_PERCENT
            );
          const top =
            50 -
            clamp(
              (relativeY / radiusKm) * MAX_MAP_OFFSET_PERCENT,
              -MAX_MAP_OFFSET_PERCENT,
              MAX_MAP_OFFSET_PERCENT
            );
          const isActive = activeMoodId === mood.id;

          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => onSelect(mood.id)}
              className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-vibe-950 text-xs font-bold shadow-lg transition-transform hover:scale-110 ${
                vibeMarkerClasses[mood.vibe]
              } ${isActive ? 'scale-110 ring-4 ring-vibe-300/40' : ''}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${mood.first_name ?? 'Nearby'} • ${mood.distance_km ?? 0} km away`}
            >
              {(mood.first_name ?? '?').slice(0, 1).toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
