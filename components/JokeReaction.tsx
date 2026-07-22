'use client';

interface JokeReactionProps {
  onReact: (reaction: 'like' | 'dislike') => void;
  pending?: boolean;
}

export function JokeReaction({ onReact, pending = false }: JokeReactionProps) {
  return (
    <div className="flex gap-2">
      <button className="btn btn-secondary" onClick={() => onReact('like')} disabled={pending}>
        👍 Like
      </button>
      <button className="btn btn-secondary" onClick={() => onReact('dislike')} disabled={pending}>
        👎 Dislike
      </button>
    </div>
  );
}
