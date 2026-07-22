import { useCallback, useEffect, useState } from 'react';
import { Message } from '@/lib/types';

export function useMessages(matchId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      if (!matchId) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages?match_id=${matchId}`, {
        headers: { Authorization: `****** },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages');
      }

      setMessages(data.messages || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!matchId || !text.trim()) return false;

      try {
        setSending(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `******
          },
          body: JSON.stringify({ match_id: matchId, text }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        await fetchMessages();
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
        return false;
      } finally {
        setSending(false);
      }
    },
    [fetchMessages, matchId]
  );

  useEffect(() => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    void fetchMessages();
    const interval = setInterval(() => {
      void fetchMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchMessages, matchId]);

  return {
    messages,
    loading,
    sending,
    error,
    fetchMessages,
    sendMessage,
  };
}
