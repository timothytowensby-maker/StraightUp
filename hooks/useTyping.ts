import { useCallback, useEffect, useRef, useState } from 'react';

export interface TypingUser {
  userId: string;
  firstName: string;
}

export function useTyping(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postTyping = useCallback(async () => {
    if (!conversationId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch('/api/messages/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `******,
        },
        body: JSON.stringify({ match_id: conversationId }),
      });
    } catch {
      // Best-effort indicator
    }
  }, [conversationId]);

  const fetchTypingUsers = useCallback(async () => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages/typing?match_id=${conversationId}`, {
        headers: { Authorization: `****** },
      });
      const data = await response.json();
      if (!response.ok) return;
      setTypingUsers(data.typingUsers || []);
    } catch {
      // Best-effort indicator
    }
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    setIsTyping(true);
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }
    stopTypingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (!isTyping) return undefined;
    void postTyping();
    const heartbeat = setInterval(() => {
      void postTyping();
    }, 1500);

    return () => clearInterval(heartbeat);
  }, [isTyping, postTyping]);

  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return undefined;
    }

    void fetchTypingUsers();
    const interval = setInterval(() => {
      void fetchTypingUsers();
    }, 1500);
    return () => clearInterval(interval);
  }, [conversationId, fetchTypingUsers]);

  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    };
  }, []);

  return { typingUsers, notifyTyping };
}
