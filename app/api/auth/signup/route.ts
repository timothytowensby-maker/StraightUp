import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { successResponse, errorResponse, validateEmail, validatePassword, handleApiError } from '@/lib/utils';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { first_name, age, city, energy_traits, email, password } = body;

    // Validation
    if (!first_name || !age || !city || !email || !password) {
      return errorResponse('Missing required fields: first_name, age, city, email, password', 400);
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    if (!validatePassword(password)) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    if (age < 18 || age > 120) {
      return errorResponse('Age must be between 18 and 120', 400);
    }

    if (!Array.isArray(energy_traits) || energy_traits.length === 0) {
      return errorResponse('Must select at least one energy trait', 400);
    }

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
