'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { JokePayload } from '@/lib/joke-utils';
import { JokeCard } from '@/components/JokeCard';

export default function JokeFavoritesPage() {
  const [favorites, setFavorites] = useState<JokePayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const response = await apiCall<{ favorites: JokePayload[] }>('/api/jokes/favorites');
        setFavorites(response.favorites);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Favorite Jokes</h1>
      <div className="space-y-4">
        {loading ? (
          <div className="text-vibe-400">Loading favorites...</div>
        ) : favorites.length === 0 ? (
          <div className="text-vibe-400">No favorite jokes yet.</div>
        ) : (
          favorites.map((joke) => <JokeCard key={joke.external_id} joke={joke} />)
        )}
      </div>
    </div>
  );
}
