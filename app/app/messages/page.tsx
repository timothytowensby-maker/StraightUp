'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageBubble } from '@/components/MessageBubble';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';

export default function Messages() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId');
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { messages, loading, sending, error, sendMessage } = useMessages(matchId);
  const { typingUsers, notifyTyping } = useTyping(matchId);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `****** },
      });
      if (!response.ok) return;
      const user = await response.json();
      setCurrentUserId(user.id || '');
    };

    void fetchCurrentUser();
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  const typingLabel = useMemo(() => {
    if (typingUsers.length === 0) {
      return '';
    }

    if (typingUsers.length === 1) {
      return `${typingUsers[0].firstName} is typing...`;
    }

    return `${typingUsers.length} people are typing...`;
  }, [typingUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId) return;

    const sent = await sendMessage(newMessage.trim());
    if (sent) {
      setNewMessage('');
    }
  };

  if (!matchId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center text-vibe-400">Select a match to view messages</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Messages</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 p-3 rounded-lg text-red-100 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {loading ? (
          <div className="text-center text-vibe-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-vibe-400">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === currentUserId} />
          ))
        )}
        {typingLabel && <p className="text-xs text-vibe-300 italic">{typingLabel}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="input flex-1"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            if (e.target.value.trim()) {
              notifyTyping();
            }
          }}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="btn btn-primary"
        >
          Send
        </button>
      </form>
    </div>
  );
}
