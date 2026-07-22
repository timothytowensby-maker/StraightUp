'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiCall } from '@/lib/api';
import { JOKE_CACHE_TTL_MS, JokePayload } from '@/lib/joke-utils';
import { JokeCard } from '@/components/JokeCard';
import { JokeLoader } from '@/components/JokeLoader';
import { JokeReaction } from '@/components/JokeReaction';
import { CategoryFilter } from '@/components/CategoryFilter';
import { JokeShare } from '@/components/JokeShare';

const LOCAL_CACHE_KEY = 'straightup:joke-cache';

interface JokeResponse {
  joke: JokePayload;
  from_cache: boolean;
  vibe: string | null;
  suggested_categories: string[];
}

export default function JokesPage() {
  const [joke, setJoke] = useState<JokePayload | null>(null);
  const [categories, setCategories] = useState<Array<{ name: string; suggested?: boolean }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('Any');
  const [loading, setLoading] = useState(true);
  const [reactionPending, setReactionPending] = useState(false);
  const [error, setError] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const prefetchJokeRef = useRef<JokePayload | null>(null);

  const cachedJoke = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > JOKE_CACHE_TTL_MS) {
        localStorage.removeItem(LOCAL_CACHE_KEY);
        return null;
      }
      return parsed.joke as JokePayload;
    } catch {
      return null;
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const response = await apiCall<{ categories: Array<{ name: string; suggested?: boolean }> }>('/api/jokes/categories');
    setCategories(response.categories);
  }, []);

  const prefetchNextJoke = useCallback(async (category: string) => {
    try {
      const response = await apiCall<JokeResponse>(`/api/jokes/random?category=${encodeURIComponent(category)}`);
      prefetchJokeRef.current = response.joke;
    } catch {
      prefetchJokeRef.current = null;
    }
  }, []);

  const fetchJoke = useCallback(async (category: string, usePrefetched = false) => {
    setLoading(true);
    setError('');

    try {
      if (usePrefetched && prefetchJokeRef.current && prefetchJokeRef.current.category === category) {
        setJoke(prefetchJokeRef.current);
        prefetchJokeRef.current = null;
      } else {
        const response = await apiCall<JokeResponse>(`/api/jokes/random?category=${encodeURIComponent(category)}`);
        setJoke(response.joke);
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ joke: response.joke, timestamp: Date.now() }));
        prefetchNextJoke(category);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load joke');
      if (cachedJoke) {
        setJoke(cachedJoke);
      }
    } finally {
      setLoading(false);
    }
  }, [cachedJoke, prefetchNextJoke]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchJoke(selectedCategory);
    }, 250);

    return () => clearTimeout(timeout);
  }, [fetchJoke, selectedCategory]);

  useEffect(() => {
    if (!joke) return;
    setLiveMessage(`Loaded ${joke.category} joke`);
  }, [joke]);

  useEffect(() => {
    const onSpace = (event: KeyboardEvent) => {
      if (
        event.code === 'Space' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        document.activeElement === document.body &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        fetchJoke(selectedCategory, true);
      }
    };

    window.addEventListener('keydown', onSpace);
    return () => window.removeEventListener('keydown', onSpace);
  }, [fetchJoke, selectedCategory]);

  const handleFavorite = async () => {
    if (!joke) return;
    try {
      await apiCall('/api/jokes/favorite', 'POST', { joke });
    } catch (err: any) {
      setError(err.message || 'Unable to save favorite');
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!joke) return;

    try {
      setReactionPending(true);
      await apiCall('/api/jokes/reaction', 'POST', {
        joke_external_id: joke.external_id,
        category: joke.category,
        reaction,
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to save reaction');
    } finally {
      setReactionPending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Random Joke Generator</h1>
        <div className="flex gap-2">
          <Link href="/app/jokes/favorites" className="btn btn-outline text-sm">Favorites</Link>
          <Link href="/app/jokes/trending" className="btn btn-outline text-sm">Trending</Link>
          <button className="btn btn-primary" onClick={() => fetchJoke(selectedCategory, true)}>
            🔄 New Joke
          </button>
        </div>
      </div>

      <CategoryFilter categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />

      {loading ? <JokeLoader /> : joke ? <JokeCard joke={joke} /> : null}

      {error ? (
        <div className="bg-red-900 border border-red-700 p-3 rounded-lg text-red-100 text-sm">{error}</div>
      ) : null}

      {joke ? (
        <div className="card flex flex-wrap gap-3 items-center justify-between">
          <JokeReaction onReact={handleReaction} pending={reactionPending} />
          <div className="flex gap-2">
            <button className="btn btn-secondary text-sm" onClick={handleFavorite}>⭐ Save</button>
            <JokeShare setup={joke.setup} delivery={joke.delivery} joke={joke.joke} />
          </div>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">{liveMessage}</div>
      <p className="text-sm text-vibe-400">Tip: press spacebar for a new joke.</p>
    </div>
  );
}
