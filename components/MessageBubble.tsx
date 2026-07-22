'use client';

import { Message } from '@/lib/types';
import { formatTime } from '@/lib/dates';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`p-3 rounded-lg ${isOwn ? 'bg-vibe-500 ml-auto' : 'bg-vibe-700'} max-w-xs`}>
      <p className="text-sm font-semibold text-vibe-100 mb-1">{message.first_name}</p>
      <p className="text-white">{message.text}</p>
      <div className="text-xs text-vibe-300 mt-1 flex items-center justify-between gap-3">
        <span>{formatTime(message.created_at)}</span>
        {isOwn && <span>{message.read ? 'Read' : 'Sent'}</span>}
      </div>
    </div>
  );
}
