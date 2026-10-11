import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  getAllServers,
  getServerById,
  createServer,
  updateServer,
  deleteServer,
  ServerRow,
} from '../db/index.js';
import { testSshConnection } from '../services/sshService.js';

const router = new Hono();

router.use('*', authMiddleware);

// Mask sensitive information when returning server list
function maskServer(server: ServerRow) {
  return {
    ...server,
    has_password: Boolean(server.password && server.password.length > 0),
    has_private_key: Boolean(server.private_key && server.private_key.length > 0),
    // Mask password in plain view
    password: server.password ? '••••••••' : null,
    // Provide a snippet or boolean for key
    private_key: server.private_key ? `${server.private_key.substring(0, 30)}...` : null,
  };
}

router.get('/', (c) => {
  const servers = getAllServers();
  return c.json({
    success: true,
    servers: servers.map(maskServer),
  });
});

router.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  const server = getServerById(id);
  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }
  return c.json({
    success: true,
    server,
  });
});

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    name,
    host,
    port,
    username,
    auth_type,
    password,
    private_key,
    passphrase,
    remote_path,
    post_command,
    description,
  } = body;

  if (!name || !host) {
    return c.json({ error: 'Name and host are required' }, 400);
  }

  if (auth_type !== 'password' && auth_type !== 'privateKey') {
    return c.json({ error: 'auth_type must be either "password" or "privateKey"' }, 400);
  }

  try {
    const created = createServer({
      name,
      host,
      port: Number(port) || 22,
      username: username || 'root',
      auth_type,
      password: password || null,
      private_key: private_key || null,
      passphrase: passphrase || null,
      remote_path: remote_path || '/usr/local/etc/xray/config.json',
      post_command: post_command || null,
      description: description || null,
    });

    return c.json({
      success: true,
      message: 'Server created successfully',
      server: maskServer(created),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

router.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const existing = getServerById(id);
  if (!existing) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.host !== undefined) updateData.host = body.host;
  if (body.port !== undefined) updateData.port = Number(body.port) || 22;
  if (body.username !== undefined) updateData.username = body.username;
  if (body.auth_type !== undefined) updateData.auth_type = body.auth_type;
  // If password is not '••••••••', update it. If empty string and keep password, don't clear unless requested
  if (body.password !== undefined && body.password !== '••••••••') {
    updateData.password = body.password || null;
  }
  if (body.private_key !== undefined && !body.private_key.endsWith('...')) {
    updateData.private_key = body.private_key || null;
  }
  if (body.passphrase !== undefined) updateData.passphrase = body.passphrase || null;
  if (body.remote_path !== undefined) updateData.remote_path = body.remote_path;
  if (body.post_command !== undefined) updateData.post_command = body.post_command || null;
  if (body.description !== undefined) updateData.description = body.description || null;

  try {
    const updated = updateServer(id, updateData);
    return c.json({
      success: true,
      message: 'Server updated successfully',
      server: updated ? maskServer(updated) : null,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

router.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  const deleted = deleteServer(id);
  if (!deleted) {
    return c.json({ error: 'Server not found or already deleted' }, 404);
  }
  return c.json({
    success: true,
    message: 'Server deleted successfully',
  });
});

// Test connection of an existing server
router.post('/:id/test', async (c) => {
  const id = Number(c.req.param('id'));
  const server = getServerById(id);
  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const result = await testSshConnection(server);
  return c.json(result);
});

// Test connection with ad-hoc / unsaved form values
router.post('/test-temp', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { host, port, username, auth_type, password, private_key, passphrase, remote_path } = body;

  if (!host) {
    return c.json({ success: false, message: 'Host is required' }, 400);
  }

  const result = await testSshConnection({
    host,
    port: Number(port) || 22,
    username: username || 'root',
    auth_type: auth_type || 'password',
    password: password || null,
    private_key: private_key || null,
    passphrase: passphrase || null,
    remote_path: remote_path || '',
  });

  return c.json(result);
});

export default router;
