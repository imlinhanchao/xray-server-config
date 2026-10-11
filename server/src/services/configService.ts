import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../config.js';

export const DOMAIN_REGEX = /^domain:([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
export const PURE_DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function normalizeDomain(raw: string): string {
  let val = raw.trim().toLowerCase();
  if (!val.startsWith('domain:')) {
    val = `domain:${val}`;
  }
  return val;
}

export function validateDomainItem(item: string): { valid: boolean; error?: string; normalized?: string } {
  if (typeof item !== 'string' || !item.trim()) {
    return { valid: false, error: '域名不能为空' };
  }

  const normalized = normalizeDomain(item);

  if (!DOMAIN_REGEX.test(normalized)) {
    return {
      valid: false,
      error: `格式不正确，必须为 domain: 开头且后缀为有效域名，例如 domain:openai.com (收到: ${item})`,
      normalized,
    };
  }

  return { valid: true, normalized };
}

export function extractDomainsFromConfig(jsonContent: string): { domains: string[]; ruleIndex: number } {
  const parsed = JSON.parse(jsonContent);
  const rules = parsed?.routing?.rules;

  if (Array.isArray(rules)) {
    // Find rule containing domain array
    for (let i = 0; i < rules.length; i++) {
      if (Array.isArray(rules[i].domain)) {
        return {
          domains: rules[i].domain,
          ruleIndex: i,
        };
      }
    }
  }

  return {
    domains: [],
    ruleIndex: -1,
  };
}

export function updateDomainsInConfig(jsonContent: string, newDomains: string[]): { updatedContent: string; formatted: string } {
  // Validate every domain
  for (const item of newDomains) {
    const check = validateDomainItem(item);
    if (!check.valid) {
      throw new Error(check.error);
    }
  }

  const parsed = JSON.parse(jsonContent);

  if (!parsed.routing) {
    parsed.routing = { domainStrategy: 'AsIs', rules: [] };
  }
  if (!Array.isArray(parsed.routing.rules)) {
    parsed.routing.rules = [];
  }

  const rules = parsed.routing.rules;
  let targetRule = rules.find((r: any) => Array.isArray(r.domain));

  if (targetRule) {
    targetRule.domain = newDomains;
  } else {
    // If no existing rule has domain array, create one
    targetRule = {
      type: 'field',
      outboundTag: 'warp-out',
      domain: newDomains,
    };
    rules.unshift(targetRule);
  }

  const formatted = JSON.stringify(parsed, null, 2);
  return {
    updatedContent: formatted,
    formatted,
  };
}

export function readConfigFile(): string {
  if (!fs.existsSync(CONFIG.CONFIG_FILE_PATH)) {
    throw new Error(`Config file not found at ${CONFIG.CONFIG_FILE_PATH}`);
  }
  return fs.readFileSync(CONFIG.CONFIG_FILE_PATH, 'utf-8');
}

export function validateJson(content: string): { valid: boolean; error?: string; formatted?: string } {
  try {
    const parsed = JSON.parse(content);
    return {
      valid: true,
      formatted: JSON.stringify(parsed, null, 2),
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || 'Invalid JSON format',
    };
  }
}

export function writeConfigFile(content: string): { success: boolean; backupPath?: string } {
  const validation = validateJson(content);
  if (!validation.valid) {
    throw new Error(`JSON validation failed: ${validation.error}`);
  }

  // Create a backup if existing file exists
  let backupPath: string | undefined;
  if (fs.existsSync(CONFIG.CONFIG_FILE_PATH)) {
    backupPath = `${CONFIG.CONFIG_FILE_PATH}.bak`;
    fs.copyFileSync(CONFIG.CONFIG_FILE_PATH, backupPath);
  }

  // Ensure directory exists
  const dir = path.dirname(CONFIG.CONFIG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write formatted JSON with trailing newline
  const contentToWrite = validation.formatted + '\n';
  fs.writeFileSync(CONFIG.CONFIG_FILE_PATH, contentToWrite, 'utf-8');

  return { success: true, backupPath };
}
