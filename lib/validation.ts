import { z } from 'zod';
import { NextRequest } from 'next/server';

// Auth schemas
export const signupSchema = z.object({
  first_name: z.string().min(1).max(100),
  age: z.number().int().min(18).max(120),
  city: z.string().min(1).max(100),
  energy_traits: z.array(z.string()).min(1).max(8),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Mood schemas
export const createMoodSchema = z.object({
  text: z.string().min(1).max(180),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Location schemas
export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  share_location: z.boolean(),
});

// Message schemas
export const sendMessageSchema = z.object({
  match_id: z.string().uuid(),
  text: z.string().min(1).max(1000),
});

// Resonate schemas
export const resonateSchema = z.object({
  mood_id: z.string().uuid(),
});

// Match schemas
export const updateMatchSchema = z.object({
  match_id: z.string().uuid(),
  extend: z.boolean().optional(),
});

export async function validateRequestBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return { error: errors };
    }

    return { data: result.data };
  } catch {
    return { error: 'Invalid JSON in request body' };
  }
}
