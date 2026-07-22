'use client';

import { LoadingSpinner } from './LoadingSpinner';

export function JokeLoader() {
  return (
    <div className="card flex items-center justify-center min-h-48">
      <LoadingSpinner text="Loading a fresh joke..." />
    </div>
  );
}
