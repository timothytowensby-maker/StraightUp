import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateRequest, successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { moderateContent } from '@/lib/ai';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { match_id, text } = body;

    if (!match_id || !text) {
      return errorResponse('match_id and text are required', 400);
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return errorResponse('Message cannot be empty', 400);
    }

    // Verify match exists and user is part of it
    const match = await queryOne(
      'SELECT * FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND expires_at > NOW()',
      [match_id, payload.id]
    );

    if (!match) {
      return errorResponse('Match not found or expired', 404);
    }

    // Moderate message
    const moderation = await moderateContent(text);
    if (!moderation.safe && moderation.severity === 'block') {
      return errorResponse('Message violates guidelines', 400);
    }

    // Create message
    const messageId = uuid();
    await query(
      'INSERT INTO messages (id, match_id, sender_id, text) VALUES ($1, $2, $3, $4)',
      [messageId, match_id, payload.id, text.trim()]
    );

    const message = await queryOne('SELECT * FROM messages WHERE id = $1', [messageId]);
    return successResponse(message, 201);
  } catch (error: any) {
    return handleApiError(error, 'Send message error');
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const matchId = searchParams.get('match_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    if (!matchId) {
      return errorResponse('match_id query parameter is required', 400);
    }

    // Verify user is part of match
    const match = await queryOne(
      'SELECT * FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2)',
      [matchId, payload.id]
    );

    if (!match) {
      return errorResponse('Match not found', 404);
    }

    // Get messages
    const messages = await query(
      `SELECT m.id, m.match_id, m.sender_id, m.text, m.created_at, m.read,
              u.first_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.match_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [matchId, limit]
    );

    // Mark as read for current user
    await query(
      'UPDATE messages SET read = TRUE WHERE match_id = $1 AND sender_id != $2',
      [matchId, payload.id]
    );

    return successResponse({ messages, count: messages.length });
  } catch (error: any) {
    return handleApiError(error, 'Get messages error');
  }
}
