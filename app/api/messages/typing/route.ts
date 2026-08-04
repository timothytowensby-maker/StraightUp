import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';
import { queryOne } from '@/lib/db';

type TypingEntry = {
  userId: string;
  firstName: string;
  updatedAt: number;
};

declare global {
  var __typingState: Map<string, Map<string, TypingEntry>> | undefined;
}

const TYPING_TTL_MS = 4000;

function getTypingState() {
  if (!globalThis.__typingState) {
    globalThis.__typingState = new Map();
  }
  return globalThis.__typingState;
}

function pruneExpiredTypingEntries(matchId: string) {
  const state = getTypingState();
  const matchEntries = state.get(matchId);
  if (!matchEntries) return;

  const now = Date.now();
  for (const [userId, entry] of matchEntries.entries()) {
    if (now - entry.updatedAt > TYPING_TTL_MS) {
      matchEntries.delete(userId);
    }
  }

  if (matchEntries.size === 0) {
    state.delete(matchId);
  }
}

async function verifyMatchAccess(matchId: string, userId: string) {
  return queryOne(
    'SELECT id FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND expires_at > NOW()',
    [matchId, userId]
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const matchId = body?.match_id;

    if (!matchId || typeof matchId !== 'string') {
      return errorResponse('match_id is required', 400);
    }

    const match = await verifyMatchAccess(matchId, payload.id);
    if (!match) {
      return errorResponse('Match not found or expired', 404);
    }

    const state = getTypingState();
    const matchEntries = state.get(matchId) || new Map<string, TypingEntry>();

    matchEntries.set(payload.id, {
      userId: payload.id,
      firstName: payload.name || 'Someone',
      updatedAt: Date.now(),
    });

    state.set(matchId, matchEntries);
    pruneExpiredTypingEntries(matchId);

    return successResponse({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, 'Set typing status error');
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const matchId = searchParams.get('match_id');

    if (!matchId) {
      return errorResponse('match_id query parameter is required', 400);
    }

    const match = await verifyMatchAccess(matchId, payload.id);
    if (!match) {
      return errorResponse('Match not found or expired', 404);
    }

    pruneExpiredTypingEntries(matchId);

    const state = getTypingState();
    const matchEntries = state.get(matchId);
    const typingUsers = matchEntries
      ? Array.from(matchEntries.values())
          .filter((entry) => entry.userId !== payload.id)
          .map((entry) => ({ userId: entry.userId, firstName: entry.firstName }))
      : [];

    return successResponse({ typingUsers });
  } catch (error: unknown) {
    return handleApiError(error, 'Get typing status error');
  }
}
