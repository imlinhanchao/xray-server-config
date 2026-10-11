import { Context, Next } from 'hono';
import { sign, verify } from 'hono/jwt';
import { CONFIG } from '../config.js';

export interface AppEnv {
  Variables: {
    user: {
      username: string;
      exp?: number;
    };
  };
}

export interface JwtPayload {
  username: string;
  exp: number;
  [key: string]: any;
}

export async function generateToken(username: string): Promise<string> {
  const payload: JwtPayload = {
    username,
    // 7 days expiration
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  return await sign(payload, CONFIG.JWT_SECRET, 'HS256');
}

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = (await verify(token, CONFIG.JWT_SECRET, 'HS256')) as unknown as JwtPayload;
    c.set('user', { username: payload.username, exp: payload.exp });
    await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
}
