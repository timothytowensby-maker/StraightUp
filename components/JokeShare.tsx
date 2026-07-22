'use client';

import { useState } from 'react';
import { formatJoke } from '@/lib/joke-utils';

interface JokeShareProps {
  setup?: string | null;
  delivery?: string | null;
  joke?: string | null;
}

export function JokeShare({ setup, delivery, joke }: JokeShareProps) {
  const [status, setStatus] = useState('');
  const text = setup && delivery ? `${formatJoke(setup)}\n${formatJoke(delivery)}` : formatJoke(joke || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleCopy} className="btn btn-outline text-sm">
        📋 Copy joke
      </button>
      {status ? <span className="text-xs text-vibe-300">{status}</span> : null}
    </div>
  );
}
