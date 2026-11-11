import { ApiError } from './ApiError.js';

// The cursor is an opaque string for the client: base64url(JSON)
export function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor) {
  try {
    const data = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!data || typeof data !== 'object' || !('v' in data) || !('id' in data) || !('s' in data)) {
      throw new Error('bad shape');
    }
    return data;
  } catch {
    throw ApiError.badRequest('Invalid cursor');
  }
}