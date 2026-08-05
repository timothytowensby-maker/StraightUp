import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { signupLimiter, getClientIp } from '@/lib/ratelimit';
import { signupSchema, validateRequestBody } from '@/lib/validation';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = getClientIp(req);
    const { success, reset } = await signupLimiter.limit(ip);
    if (!success) {
      return errorResponse(
        `Too many signup attempts. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds`,
        429
      );
    }

    // Validate with Zod
    const { data: body, error: validationError } = await validateRequestBody(req, signupSchema);
    if (validationError) {
      return errorResponse(`Validation error: ${validationError}`, 400);
    }

    const { first_name, age, city, energy_traits, email, password } = body!;

    // Check if email exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    // Hash password and create user
    const hashedPassword = hashPassword(password);
    const userId = uuid();

    await query(
      `INSERT INTO users (id, first_name, age, city, energy_traits, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, first_name, age, city, energy_traits, email, hashedPassword]
    );

    // Fetch created user
    const user = await queryOne(
      'SELECT id, first_name, age, city, energy_traits, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    const token = generateToken(user);

    return successResponse({ token, user }, 201);
  } catch (error) {
    return handleApiError(error, 'Signup error');
  }
}
