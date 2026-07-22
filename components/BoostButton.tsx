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

  const handleBoost = async () => {
    try {
      setLoading(true);
      await apiCall('/api/moods/boost', 'POST', { vibeId });
      setIsBoosted(true);
      onBoosted?.();
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}
