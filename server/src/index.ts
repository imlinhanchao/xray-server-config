import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import path from 'node:path';
import fs from 'node:fs';

import { CONFIG, ROOT_DIR } from './config.js';
import { initDatabase } from './db/index.js';
import authRouter from './routes/auth.js';
import configRouter from './routes/config.js';
import serversRouter from './routes/servers.js';
import historyRouter from './routes/history.js';
import sshRouter from './routes/ssh.js';

// Initialize SQLite database
initDatabase();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// API Routes
app.route('/api/auth', authRouter);
app.route('/api/config', configRouter);
app.route('/api/servers', serversRouter);
app.route('/api/history', historyRouter);
app.route('/api/ssh', sshRouter);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configPath: CONFIG.CONFIG_FILE_PATH,
  });
});

// Production Static Web Serving
const webDistPath = path.resolve(ROOT_DIR, 'web/dist');
if (fs.existsSync(webDistPath)) {
  const relativeDist = path.relative(process.cwd(), webDistPath) || '.';
  console.log(`Serving web frontend from ${webDistPath} (relative: ${relativeDist})`);
  app.use('/assets/*', serveStatic({ root: relativeDist }));
  app.use('/favicon.ico', serveStatic({ root: relativeDist }));

  // Fallback to index.html for SPA routing
  app.get('*', (c) => {
    // If it's an API route that wasn't handled, return 404 JSON
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'API route not found' }, 404);
    }
    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf-8'));
    }
    return c.text('Frontend index.html not found', 404);
  });
} else {
  app.get('/', (c) => {
    return c.json({
      message: 'Xray Config Manager Backend API is running.',
      frontend: 'Web frontend is running in dev mode or not yet built.',
    });
  });
}

// Start Node server
const server = serve(
  {
    fetch: app.fetch,
    port: CONFIG.PORT,
    hostname: CONFIG.HOST,
  },
  (info) => {
    console.log(`===============================================`);
    console.log(`  Xray Config Manager Backend is running!`);
    console.log(`  URL: http://localhost:${info.port}`);
    console.log(`  Config Target: ${CONFIG.CONFIG_FILE_PATH}`);
    console.log(`  DB Path: ${CONFIG.DB_PATH}`);
    console.log(`  Default Login: ${CONFIG.APP_USERNAME} / ${CONFIG.APP_PASSWORD}`);
    console.log(`===============================================`);
  }
);

export default app;
