import { Hono } from 'hono';
import { authMiddleware, AppEnv } from '../middleware/auth.js';
import {
  readConfigFile,
  validateJson,
  writeConfigFile,
  extractDomainsFromConfig,
  updateDomainsInConfig,
  validateDomainItem,
  normalizeDomain,
} from '../services/configService.js';
import { createHistoryRecord, getLatestHistory } from '../db/index.js';
import { CONFIG } from '../config.js';

const router = new Hono<AppEnv>();

router.use('*', authMiddleware);

router.get('/', (c) => {
  try {
    const rawContent = readConfigFile();
    const validation = validateJson(rawContent);
    const latestHistory = getLatestHistory();

    let domains: string[] = [];
    if (validation.valid) {
      const extracted = extractDomainsFromConfig(rawContent);
      domains = extracted.domains;
    }

    return c.json({
      success: true,
      domains,
      content: rawContent,
      formatted: validation.formatted || rawContent,
      isValidJson: validation.valid,
      jsonError: validation.error,
      latestHistory,
      configPath: CONFIG.CONFIG_FILE_PATH,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

router.post('/validate-domain', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domain, domains } = body;

  if (typeof domain === 'string') {
    const result = validateDomainItem(domain);
    return c.json(result);
  }

  if (Array.isArray(domains)) {
    const results = domains.map((d: any) => ({
      raw: d,
      ...validateDomainItem(String(d)),
    }));
    const allValid = results.every((r) => r.valid);
    return c.json({ valid: allValid, results });
  }

  return c.json({ error: 'domain or domains array is required' }, 400);
});

router.post('/save', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domains, content, title, description } = body;

  const user = c.get('user');

  try {
    let finalContent = '';
    let finalDomains: string[] = [];

    if (Array.isArray(domains)) {
      // Clean and validate domains
      finalDomains = domains.map((d: string) => normalizeDomain(String(d)));

      for (const d of finalDomains) {
        const check = validateDomainItem(d);
        if (!check.valid) {
          return c.json({ success: false, error: check.error }, 400);
        }
      }

      const currentRaw = readConfigFile();
      const updated = updateDomainsInConfig(currentRaw, finalDomains);
      finalContent = updated.formatted;
    } else if (typeof content === 'string') {
      const validation = validateJson(content);
      if (!validation.valid) {
        return c.json({ success: false, error: `Invalid JSON format: ${validation.error}` }, 400);
      }
      finalContent = validation.formatted!;
      finalDomains = extractDomainsFromConfig(finalContent).domains;
    } else {
      return c.json({ error: 'domains array or content string is required' }, 400);
    }

    // Write to config.json
    writeConfigFile(finalContent);

    // Record into history
    const historyTitle = title?.trim() || `域名列表更新 (${finalDomains.length} 个域名)`;
    const historyDesc = description?.trim() || `维护 domain 路由列表，共 ${finalDomains.length} 个条目`;

    const history = createHistoryRecord({
      title: historyTitle,
      description: historyDesc,
      content: finalContent,
      operator: user?.username || 'admin',
      action_type: 'edit',
    });

    return c.json({
      success: true,
      message: '域名配置已成功保存并同步写入 config.json！',
      domains: finalDomains,
      content: finalContent,
      history,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default router;
