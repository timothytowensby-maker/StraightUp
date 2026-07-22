'use client';

import { useState } from 'react';
import { apiCall } from '@/lib/api';
import { Button } from './Button';

interface BoostButtonProps {
  vibeId: string;
  boosted?: boolean;
  onBoosted?: () => void;
}

export default function BoostButton({
  vibeId,
  boosted = false,
  onBoosted,
}: BoostButtonProps) {
  const [isBoosted, setIsBoosted] = useState(boosted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBoost = async () => {
    try {
      setLoading(true);
      setError('');
      await apiCall('/api/moods/boost', 'POST', { vibeId });
      setIsBoosted(true);
      onBoosted?.();
    } catch (boostError: unknown) {
      setError(boostError instanceof Error ? boostError.message : 'Unable to boost vibe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant={isBoosted ? 'secondary' : 'primary'}
        size="sm"
        isLoading={loading}
        disabled={isBoosted}
        onClick={() => {
          void handleBoost();
        }}
      >
        {isBoosted ? '✨ Boosted' : '🚀 Boost vibe'}
      </Button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
