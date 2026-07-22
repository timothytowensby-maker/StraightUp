'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { JokeCard } from '@/components/JokeCard';
import { JokePayload } from '@/lib/joke-utils';

type TrendingJoke = JokePayload & {
  likes: number;
  dislikes: number;
  favorites: number;
};

export default function JokeTrendingPage() {
  const [trending, setTrending] = useState<TrendingJoke[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await apiCall<{ trending: TrendingJoke[] }>('/api/jokes/trending');
        setTrending(response.trending);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Trending Jokes</h1>
      <div className="space-y-4">
        {loading ? (
          <div className="text-vibe-400">Loading trending jokes...</div>
        ) : trending.length === 0 ? (
          <div className="text-vibe-400">No trending jokes yet.</div>
        ) : (
          trending.map((joke) => (
            <div key={joke.external_id} className="space-y-2">
              <JokeCard joke={joke} />
              <p className="text-sm text-vibe-400 px-2">👍 {joke.likes} • 👎 {joke.dislikes} • ⭐ {joke.favorites}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
