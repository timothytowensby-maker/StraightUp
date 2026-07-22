'use client';

import { useEffect, useState } from 'react';
import { Mood } from '@/lib/types';

export default function Feed() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [moodText, setMoodText] = useState('');

  useEffect(() => {
    fetchMoods();
  }, []);

  const fetchMoods = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/moods', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMoods(data.moods || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostMood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodText.trim()) return;

    try {
      setPosting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/moods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: moodText }),
      });

      const data = await response.json();
      if (response.ok) {
        setMoodText('');
        fetchMoods();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleResonate = async (moodId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/resonates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mood_id: moodId }),
      });

      if (response.ok) {
        fetchMoods();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">What\'s your vibe?</h2>
        <form onSubmit={handlePostMood} className="space-y-4">
          <textarea
            className="input h-20 resize-none"
            placeholder="Drop your mood... (max 180 chars)"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value.slice(0, 180))}
            maxLength={180}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-vibe-400">{moodText.length}/180</span>
            <button
              type="submit"
              disabled={posting || !moodText.trim()}
              className="btn btn-primary"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg text-red-100 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-vibe-400">Loading moods...</div>
        ) : moods.length === 0 ? (
          <div className="text-center text-vibe-400">No moods yet. Be the first!</div>
        ) : (
          moods.map((mood) => (
            <div key={mood.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{mood.first_name}, {mood.age}</h3>
                  <p className="text-sm text-vibe-400">{mood.city}</p>
                </div>
                <span className="badge">{mood.vibe}</span>
              </div>
              <p className="text-vibe-100 mb-4">{mood.text}</p>
              {mood.tags && mood.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {mood.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-vibe-700 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleResonate(mood.id)}
                className="btn btn-secondary w-full"
              >
                ✨ Resonate
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
