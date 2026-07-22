'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
    } else {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-vibe-300">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-vibe-900 border-b border-vibe-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/app/feed" className="text-2xl font-bold text-vibe-300">
            StraightUp
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/app/feed" className="text-vibe-300 hover:text-white">
              Feed
            </Link>
            <Link href="/app/matches" className="text-vibe-300 hover:text-white">
              Matches
            </Link>
            <Link href="/app/messages" className="text-vibe-300 hover:text-white">
              Messages
            </Link>
            <Link href="/app/jokes" className="text-vibe-300 hover:text-white">
              Jokes
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
