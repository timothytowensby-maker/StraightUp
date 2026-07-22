'use client';

import {
  ALLOWED_NEARBY_DISTANCE_MILES,
  NearbyDistanceMiles,
  normalizeNearbyDistanceMiles,
} from '@/lib/nearby';

type NearbyDistanceSelectorProps = {
  value: number;
  onChange: (distanceMiles: NearbyDistanceMiles) => void;
  disabled?: boolean;
};

export default function NearbyDistanceSelector({
  value,
  onChange,
  disabled = false,
}: NearbyDistanceSelectorProps) {
  const selectedDistance = normalizeNearbyDistanceMiles(value);

  return (
    <div className="flex flex-wrap gap-2">
      {ALLOWED_NEARBY_DISTANCE_MILES.map((distanceMiles) => {
        const isSelected = selectedDistance === distanceMiles;

        return (
          <button
            key={distanceMiles}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              isSelected
                ? 'border-vibe-300 bg-vibe-300 text-vibe-950'
                : 'border-vibe-700 bg-vibe-900 text-vibe-200 hover:border-vibe-500 hover:text-vibe-100'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={() => onChange(distanceMiles)}
            disabled={disabled}
            aria-pressed={isSelected}
          >
            {distanceMiles} miles
          </button>
        );
      })}
    </div>
  );
}
