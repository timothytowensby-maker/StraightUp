'use client';

import { formatJoke } from '@/lib/joke-utils';

interface JokeShareProps {
  setup?: string | null;
  delivery?: string | null;
  joke?: string | null;
}

export function JokeShare({ setup, delivery, joke }: JokeShareProps) {
  const text = setup && delivery ? `${formatJoke(setup)}\n${formatJoke(delivery)}` : formatJoke(joke || '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <button onClick={handleCopy} className="btn btn-outline text-sm">
      📋 Copy joke
    </button>
  );
}
