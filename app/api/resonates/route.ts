import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateRequest, successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { v4 as uuid } from 'uuid';
import { addHours } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const { mood_id } = body;

    if (!mood_id) {
      return errorResponse('mood_id is required', 400);
    }

    // Get mood and its creator
    const mood = await queryOne('SELECT * FROM moods WHERE id = $1 AND expires_at > NOW()', [mood_id]);
    if (!mood) {
      return errorResponse('Mood not found or expired', 404);
    }

    // Can't resonate to own mood
    if (mood.user_id === payload.id) {
      return errorResponse('Cannot resonate to your own mood', 400);
    }

    // Check if already resonated
    const existing = await queryOne(
      'SELECT id FROM resonates WHERE from_user = $1 AND to_mood = $2',
      [payload.id, mood_id]
    );

    if (existing) {
      return errorResponse('Already resonated to this mood', 409);
    }

    // Create resonate
    const resonateId = uuid();
    await query(
      'INSERT INTO resonates (id, from_user, to_mood) VALUES ($1, $2, $3)',
      [resonateId, payload.id, mood_id]
    );

    // Check for mutual resonance to trigger match
    const mutualResonate = await queryOne(
      `SELECT r.from_user FROM resonates r
       WHERE r.to_mood IN (SELECT id FROM moods WHERE user_id = $1 AND expires_at > NOW())
       AND r.from_user = $2
       LIMIT 1`,
      [payload.id, mood.user_id]
    );

    let matched = false;
    if (mutualResonate) {
      // Create match if doesn't exist
      const matchId = uuid();
      const expiresAt = addHours(new Date(), 48);

      try {
        await query(
          `INSERT INTO matches (id, user_a, user_b, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_a, user_b) DO NOTHING`,
          [matchId, payload.id, mood.user_id, expiresAt]
        );
        matched = true;
      } catch (error) {
        console.error('Match creation error:', error);
      }
    }

    return successResponse({ resonated: true, matched, resonateId });
  } catch (error: any) {
    return handleApiError(error, 'Resonate error');
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const resonates = await query(
      `SELECT r.id, r.from_user, r.to_mood, r.created_at, m.text, m.vibe, u.first_name, u.city
       FROM resonates r
       JOIN moods m ON r.to_mood = m.id
       JOIN users u ON m.user_id = u.id
       WHERE r.from_user = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [payload.id]
    );

    return successResponse({ resonates, count: resonates.length });
  } catch (error: any) {
    return handleApiError(error, 'Get resonates error');
  }
}
