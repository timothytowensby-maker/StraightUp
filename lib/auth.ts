import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ JWT_SECRET not set in production!');
}

export function hashPassword(password: string): string {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function generateToken(user: User): string {
  try {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.first_name,
      },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'] }
    );
  } catch (error) {
    console.error('Token generation error:', error);
    throw error;
  }
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
