import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest, handleApiError, successResponse } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    authenticateRequest(req);

    const trending = await query(
      `SELECT jr.joke_external_id as external_id,
              COALESCE(MAX(jc.category), MAX(jr.category)) as category,
              MAX(jc.joke_type) as type,
              MAX(jc.setup) as setup,
              MAX(jc.delivery) as delivery,
              MAX(jc.joke) as joke,
              COALESCE(BOOL_OR(jc.safe), TRUE) as safe,
              SUM(CASE WHEN jr.reaction = 'like' THEN 1 ELSE 0 END)::int as likes,
              SUM(CASE WHEN jr.reaction = 'dislike' THEN 1 ELSE 0 END)::int as dislikes,
              SUM(CASE WHEN jr.reaction = 'favorite' THEN 1 ELSE 0 END)::int as favorites
       FROM joke_reactions jr
       LEFT JOIN jokes_cache jc ON jr.joke_external_id = jc.external_id
       GROUP BY jr.joke_external_id
       ORDER BY (SUM(CASE WHEN jr.reaction = 'like' THEN 1 ELSE 0 END) - SUM(CASE WHEN jr.reaction = 'dislike' THEN 1 ELSE 0 END)) DESC,
                SUM(CASE WHEN jr.reaction = 'favorite' THEN 1 ELSE 0 END) DESC,
                MAX(jr.created_at) DESC
       LIMIT 25`
    );

    return successResponse({ trending });
  } catch (error: any) {
    return handleApiError(error, 'Get trending jokes error');
  }
}
