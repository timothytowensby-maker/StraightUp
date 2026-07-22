"use client";

import React from 'react';
import { Vibe } from '@/lib/types';
import { timeAgo } from '@/lib/dates';
import { vibeColors } from '@/lib/vibeColors';
import { getVibeEmoji } from '@/lib/vibes';
import VibeReactions from './VibeReactions';

interface VibeCardProps {
  moodId: string;
  text: string;
  vibe: Vibe;
  userName: string;
  userAge?: number;
  userCity?: string;
  tags?: string[];
  reactions?: string[];
  boosted?: boolean;
  createdAt?: string;
  distanceLabel?: string | null;
  onResonate?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  showReactions?: boolean;
  footer?: React.ReactNode;
}

export function VibeCard({
  moodId,
  text,
  vibe,
  userName,
  userAge,
  userCity,
  tags = [],
  reactions = [],
  boosted = false,
  createdAt,
  distanceLabel,
  onResonate,
  onAction,
  actionLabel = 'Resonate',
  showReactions = true,
  footer,
}: VibeCardProps) {
  const buttonHandler = onResonate || onAction;
  const hasMeta = Boolean(userCity);

  return (
    <article className="card border border-vibe-800/80 bg-vibe-950/90 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-vibe-50">
              {userName}
              {typeof userAge === 'number' ? `, ${userAge}` : ''}
            </h3>
            {createdAt && <span className="text-xs text-vibe-400">{timeAgo(createdAt)}</span>}
          </div>
          {hasMeta && (
            <p className="text-sm text-vibe-400">
              {userCity}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${vibeColors[vibe]}`}>
            {getVibeEmoji(vibe)} {vibe}
          </span>
          {boosted && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">Boosted</span>}
          {distanceLabel && <span className="text-xs text-vibe-400">{distanceLabel}</span>}
        </div>
      </div>

      <p className="mb-4 text-base leading-relaxed text-vibe-100">{text}</p>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-vibe-800 px-3 py-1 text-xs text-vibe-200">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {showReactions && <VibeReactions moodId={moodId} reactions={reactions} />}

      {(buttonHandler || footer) && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {buttonHandler ? (
            <button onClick={buttonHandler} className="btn btn-secondary w-full sm:w-auto">
              {getVibeEmoji(vibe)} {actionLabel}
            </button>
          ) : (
            null
          )}
          {footer}
        </div>
      )}
    </article>
  );
}
