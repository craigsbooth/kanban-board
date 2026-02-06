import { User } from '@prisma/client';
import { PublicUser } from '../types';

/**
 * Converts a User from the database to a PublicUser (without sensitive data)
 * This removes the passwordHash field before sending to the frontend
 */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Converts multiple Users to PublicUsers
 */
export function toPublicUsers(users: User[]): PublicUser[] {
  return users.map(toPublicUser);
}

/**
 * Validates username format
 * - Must be 3-30 characters
 * - Can contain letters, numbers, underscores, and hyphens
 * - Must start with a letter or number
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$/;
  return usernameRegex.test(username);
}

/**
 * Validates email format using a simple regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * - Must be at least 8 characters
 * - Must contain at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return hasLetter && hasNumber;
}