import { Hono } from 'hono';
import { authMiddleware, AppEnv } from '../middleware/auth.js';
import {
  getAllHistory,
  getHistoryById,
  getHistoryByVersion,
  createHistoryRecord,
} from '../db/index.js';
import { writeConfigFile, validateJson } from '../services/configService.js';

const router = new Hono<AppEnv>();

router.use('*', authMiddleware);

router.get('/', (c) => {
  const limit = Number(c.req.query('limit')) || 100;
  const offset = Number(c.req.query('offset')) || 0;
  const list = getAllHistory(limit, offset);
  return c.json({
    success: true,
    history: list,
  });
});

router.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  const record = getHistoryById(id);
  if (!record) {
    return c.json({ error: 'History record not found' }, 404);
  }
  return c.json({
    success: true,
    history: record,
  });
});

router.get('/compare/:v1/:v2', (c) => {
  const v1 = Number(c.req.param('v1'));
  const v2 = Number(c.req.param('v2'));

  const rec1 = getHistoryByVersion(v1) || getHistoryById(v1);
  const rec2 = getHistoryByVersion(v2) || getHistoryById(v2);

  if (!rec1 || !rec2) {
    return c.json({ error: 'One or both history versions not found' }, 404);
  }

  return c.json({
    success: true,
    v1: {
      version: rec1.version,
      title: rec1.title,
      created_at: rec1.created_at,
      content: rec1.content,
    },
    v2: {
      version: rec2.version,
      title: rec2.title,
      created_at: rec2.created_at,
      content: rec2.content,
    },
  });
});

router.post('/:id/rollback', async (c) => {
  const id = Number(c.req.param('id'));
  const targetHistory = getHistoryById(id);
  if (!targetHistory) {
    return c.json({ error: 'History record not found' }, 404);
  }

  const validation = validateJson(targetHistory.content);
  if (!validation.valid) {
    return c.json({ error: `Cannot rollback to invalid JSON: ${validation.error}` }, 400);
  }

  const user = c.get('user');

  try {
    // Write target content to config.json
    writeConfigFile(targetHistory.content);

    // Create a new rollback record
    const newRecord = createHistoryRecord({
      title: `回滚到版本 v${targetHistory.version}`,
      description: `回滚自历史记录 ID ${targetHistory.id} (${targetHistory.title})`,
      content: validation.formatted || targetHistory.content,
      operator: user?.username || 'admin',
      action_type: 'rollback',
    });

    return c.json({
      success: true,
      message: `Successfully rolled back to version ${targetHistory.version}`,
      history: newRecord,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default router;
