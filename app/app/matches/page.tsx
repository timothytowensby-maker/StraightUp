'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Match } from '@/lib/types';

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Matches</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg text-red-100 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="text-center text-vibe-400 col-span-full">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center text-vibe-400 col-span-full">No active matches yet. Keep resonating!</div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="card">
              <h3 className="text-xl font-bold mb-2">{match.matched_user_name}, {match.matched_user_age}</h3>
              <p className="text-vibe-400 mb-2">{match.matched_user_city}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {match.matched_user_traits?.map((trait: string) => (
                  <span key={trait} className="text-xs badge">
                    {trait}
                  </span>
                ))}
              </div>
              <p className="text-sm text-vibe-300 mb-4">
                Matched {new Date(match.created_at).toLocaleDateString()}
              </p>
              <Link
                href={`/app/messages?matchId=${match.id}`}
                className="btn btn-primary w-full text-center"
              >
                Message
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
