'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message } from '@/lib/types';

export default function Messages() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [matchId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages?match_id=${matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ match_id: matchId, text: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
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
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.sender_id === localStorage.getItem('user_id')
                  ? 'bg-vibe-500 ml-auto'
                  : 'bg-vibe-700'
              } max-w-xs`}
            >
              <p className="text-sm font-semibold text-vibe-100 mb-1">{msg.first_name}</p>
              <p className="text-white">{msg.text}</p>
              <p className="text-xs text-vibe-300 mt-1">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="input flex-1"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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
