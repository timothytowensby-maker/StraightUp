"use client";

import React from 'react';
import { Vibe } from '@/lib/types';
import { getVibeEmoji } from '@/lib/vibes';

interface VibeCardProps {
  text: string;
  vibe: Vibe;
  userName: string;
  userAge: number;
  userCity: string;
  tags?: string[];
  onResonate?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function VibeCard({
  text,
  vibe,
  userName,
  userAge,
  userCity,
  tags = [],
  onResonate,
  onAction,
  actionLabel = 'Resonate',
}: VibeCardProps) {
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">
            {userName}, {userAge}
          </h3>
          <p className="text-sm text-vibe-400">{userCity}</p>
        </div>
        <div className="text-center">
          <span className="text-2xl">{getVibeEmoji(vibe)}</span>
          <p className="text-xs font-semibold text-vibe-300">{vibe}</p>
        </div>
      </div>
      <p className="text-vibe-100 mb-4">{text}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <span key={tag} className="text-xs bg-vibe-700 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onResonate || onAction}
        className="btn btn-secondary w-full"
      >
        {getVibeEmoji(vibe)} {actionLabel}
      </button>
    </div>
  );
}
