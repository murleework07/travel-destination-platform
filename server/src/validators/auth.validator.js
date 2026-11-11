import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email address').max(255);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
});