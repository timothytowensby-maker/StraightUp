'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiCall } from '@/lib/api';

const MOOD_REACTION_EMOJIS = ['🔥', '😂', '❤️', '😎', '💯'] as const;

interface VibeReactionsProps {
  moodId: string;
  reactions?: string[];
}

export default function VibeReactions({ moodId, reactions = [] }: VibeReactionsProps) {
  const [items, setItems] = useState<string[]>(reactions);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);

  useEffect(() => {
    setItems(reactions);
  }, [reactions]);

  const reactionCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((counts, emoji) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
      return counts;
    }, {});
  }, [items]);

  const handleReact = async (emoji: string) => {
    try {
      setPendingEmoji(emoji);
      const response = await apiCall<{ reactions?: string[] }>('/api/moods', 'PATCH', {
        moodId,
        emoji,
      });
      setItems(response.reactions || [...items, emoji]);
    } catch {
      // keep the main vibe feed usable even if a reaction fails
    } finally {
      setPendingEmoji(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {MOOD_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              void handleReact(emoji);
            }}
            disabled={pendingEmoji === emoji}
            className="rounded-full border border-vibe-700 bg-vibe-900/60 px-3 py-1 text-sm transition hover:border-vibe-500 hover:bg-vibe-800 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`React with ${emoji}`}
          >
            <span className="mr-1">{emoji}</span>
            <span className="text-vibe-300">{reactionCounts[emoji] || 0}</span>
          </button>
        ))}
      </div>
      {items.length > 0 && (
        <p className="text-xs text-vibe-400">
          {items.length} reaction{items.length === 1 ? '' : 's'} on this vibe
        </p>
      )}
    </div>
  );
}
