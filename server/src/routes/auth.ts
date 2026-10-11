import { Hono } from 'hono';
import { CONFIG } from '../config.js';
import { generateToken, authMiddleware, AppEnv } from '../middleware/auth.js';

const router = new Hono<AppEnv>();

router.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  if (username === CONFIG.APP_USERNAME && password === CONFIG.APP_PASSWORD) {
    const token = await generateToken(username);
    return c.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin',
      },
    });
  }

  return c.json({ error: 'Invalid username or password' }, 401);
});

router.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({
    success: true,
    user: {
      username: user.username,
      role: 'admin',
    },
  });
});

export default router;
