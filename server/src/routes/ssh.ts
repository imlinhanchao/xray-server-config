import { Hono } from 'hono';
import { authMiddleware, AppEnv } from '../middleware/auth.js';
import { getServerById, createHistoryRecord } from '../db/index.js';
import { pushConfigToRemote, pullConfigFromRemote } from '../services/sshService.js';
import { readConfigFile, validateJson, writeConfigFile } from '../services/configService.js';

const router = new Hono<AppEnv>();

router.use('*', authMiddleware);

// Push configuration to a remote server
router.post('/push', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { server_id, content, execute_post_command, custom_remote_path } = body;

  if (!server_id) {
    return c.json({ error: 'server_id is required' }, 400);
  }

  const server = getServerById(Number(server_id));
  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const effectiveServer = custom_remote_path
    ? { ...server, remote_path: custom_remote_path }
    : server;

  // If content is provided, validate it; otherwise use current local config.json
  const configContent = typeof content === 'string' && content.trim().length > 0
    ? content
    : readConfigFile();

  const validation = validateJson(configContent);
  if (!validation.valid) {
    return c.json({ error: `Cannot push invalid JSON: ${validation.error}` }, 400);
  }

  const user = c.get('user');

  try {
    const pushResult = await pushConfigToRemote(
      effectiveServer,
      validation.formatted || configContent,
      execute_post_command ?? true
    );

    if (!pushResult.success) {
      return c.json({
        success: false,
        message: pushResult.message,
      }, 500);
    }

    // Record push history
    const history = createHistoryRecord({
      title: `推送到服务器: ${server.name} (${server.host})`,
      description: `远程目录: ${effectiveServer.remote_path}${pushResult.postCommandResult ? ` | 执行命令: ${pushResult.postCommandResult.command} (code: ${pushResult.postCommandResult.code})` : ''}`,
      content: validation.formatted || configContent,
      operator: user?.username || 'admin',
      action_type: 'push',
      server_id: server.id,
      server_name: `${server.name} (${server.host})`,
    });

    return c.json({
      success: true,
      message: pushResult.message,
      postCommandResult: pushResult.postCommandResult,
      history,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Pull configuration from a remote server
router.post('/pull', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { server_id, custom_remote_path, save_to_local, title, description } = body;

  if (!server_id) {
    return c.json({ error: 'server_id is required' }, 400);
  }

  const server = getServerById(Number(server_id));
  if (!server) {
    return c.json({ error: 'Server not found' }, 404);
  }

  const effectiveServer = custom_remote_path
    ? { ...server, remote_path: custom_remote_path }
    : server;

  try {
    const pullResult = await pullConfigFromRemote(effectiveServer);

    if (!pullResult.success) {
      return c.json({
        success: false,
        message: pullResult.message,
      }, 500);
    }

    const validation = validateJson(pullResult.content);

    let historyRecord = null;
    if (save_to_local) {
      if (!validation.valid) {
        return c.json({
          success: false,
          error: `Remote file is not valid JSON, cannot save locally: ${validation.error}`,
          rawContent: pullResult.content,
        }, 400);
      }

      // Write to local file
      writeConfigFile(pullResult.content);

      const user = c.get('user');
      historyRecord = createHistoryRecord({
        title: title || `从 ${server.name} (${server.host}) 拉取最新配置`,
        description: description || `远程路径: ${effectiveServer.remote_path}`,
        content: validation.formatted || pullResult.content,
        operator: user?.username || 'admin',
        action_type: 'pull',
        server_id: server.id,
        server_name: `${server.name} (${server.host})`,
      });
    }

    return c.json({
      success: true,
      message: pullResult.message,
      content: pullResult.content,
      formatted: validation.formatted,
      isValidJson: validation.valid,
      jsonError: validation.error,
      server: {
        id: server.id,
        name: server.name,
        host: server.host,
        remote_path: effectiveServer.remote_path,
      },
      history: historyRecord,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default router;
