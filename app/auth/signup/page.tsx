'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ENERGY_TRAITS = [
  'calm', 'funny', 'direct', 'low-key', 'intense', 'creative', 'chill', 'driven'
];

export default function SignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    first_name: '',
    age: '',
    city: '',
    email: '',
    password: '',
  });

  const handleTraitToggle = (trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (selectedTraits.length === 0) {
        throw new Error('Select at least one energy trait');
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age),
          energy_traits: selectedTraits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      localStorage.setItem('token', data.token);
      router.push('/app/feed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-vibe-300 mb-2">StraightUp</h1>
          <p className="text-vibe-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900 border border-red-700 p-3 rounded-lg text-red-100 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="First name"
            className="input"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />

          <input
            type="email"
            placeholder="Email"
            className="input"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Password (min 6 chars)"
            className="input"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <input
            type="number"
            placeholder="Age (18+)"
            className="input"
            min="18"
            max="120"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            required
          />

          <input
            type="text"
            placeholder="City"
            className="input"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />

          <div className="mt-6">
            <p className="text-sm font-semibold text-vibe-300 mb-3">Pick your energy traits:</p>
            <div className="grid grid-cols-2 gap-2">
              {ENERGY_TRAITS.map((trait) => (
                <button
                  key={trait}
                  type="button"
                  onClick={() => handleTraitToggle(trait)}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    selectedTraits.includes(trait)
                      ? 'bg-vibe-500 text-white'
                      : 'bg-vibe-700 text-vibe-300 hover:bg-vibe-600'
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-vibe-400 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-vibe-300 hover:text-vibe-200 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
