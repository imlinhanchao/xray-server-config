import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchConfig, saveConfig as apiSaveConfig } from '../api/config.js';
import { HistoryItem } from '../types/index.js';
import { useToastStore } from './toast.js';

export const DOMAIN_REGEX = /^domain:([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function normalizeDomainStr(raw: string): string {
  let val = raw.trim().toLowerCase();
  if (!val.startsWith('domain:')) {
    val = `domain:${val}`;
  }
  return val;
}

export function isValidDomainFormat(domain: string): boolean {
  const normalized = normalizeDomainStr(domain);
  return DOMAIN_REGEX.test(normalized);
}

export function extractDomainsFromJson(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const rules = parsed?.routing?.rules;
    if (Array.isArray(rules)) {
      for (const r of rules) {
        if (Array.isArray(r.domain)) {
          return r.domain;
        }
      }
    }
  } catch {}
  return [];
}

export function injectDomainsIntoJson(jsonStr: string, newDomains: string[]): string {
  try {
    const parsed = JSON.parse(jsonStr || '{}');
    if (!parsed.routing) parsed.routing = { domainStrategy: 'AsIs', rules: [] };
    if (!Array.isArray(parsed.routing.rules)) parsed.routing.rules = [];

    const targetRule = parsed.routing.rules.find((r: any) => Array.isArray(r.domain));
    if (targetRule) {
      targetRule.domain = newDomains;
    } else {
      parsed.routing.rules.unshift({
        type: 'field',
        outboundTag: 'warp-out',
        domain: newDomains,
      });
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonStr;
  }
}

export const useConfigStore = defineStore('config', () => {
  const editMode = ref<'domains' | 'full'>('domains');
  const domains = ref<string[]>([]);
  const originalDomains = ref<string[]>([]);
  const content = ref('');
  const originalContent = ref('');
  const configPath = ref('');
  const latestHistory = ref<HistoryItem | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const jsonError = ref<string | null>(null);

  const toast = useToastStore();

  const isDomainDirty = computed(() => {
    if (domains.value.length !== originalDomains.value.length) return true;
    return JSON.stringify(domains.value) !== JSON.stringify(originalDomains.value);
  });

  const isContentDirty = computed(() => content.value !== originalContent.value);

  const isDirty = computed(() => {
    if (editMode.value === 'domains') {
      return isDomainDirty.value;
    }
    return isContentDirty.value;
  });

  const isValidJson = computed(() => jsonError.value === null);

  const domainsAsText = computed(() => domains.value.join('\n'));
  const originalDomainsAsText = computed(() => originalDomains.value.join('\n'));

  function checkJsonValidity(val: string): boolean {
    if (!val.trim()) {
      jsonError.value = '配置内容不能为空';
      return false;
    }
    try {
      JSON.parse(val);
      jsonError.value = null;
      return true;
    } catch (err: any) {
      jsonError.value = err.message;
      return false;
    }
  }

  function setContent(newContent: string) {
    content.value = newContent;
    checkJsonValidity(newContent);
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(content.value);
      content.value = JSON.stringify(parsed, null, 2);
      jsonError.value = null;
      toast.info('JSON 配置已格式化');
    } catch (err: any) {
      toast.error(`格式化失败，JSON 格式有误: ${err.message}`);
    }
  }

  function syncDomainsToJson() {
    content.value = injectDomainsIntoJson(content.value, domains.value);
    checkJsonValidity(content.value);
  }

  function syncJsonToDomains(): boolean {
    if (!checkJsonValidity(content.value)) {
      toast.error(`切换失败，JSON 存在语法错误: ${jsonError.value}`);
      return false;
    }
    domains.value = extractDomainsFromJson(content.value);
    return true;
  }

  function switchEditMode(mode: 'domains' | 'full') {
    if (mode === editMode.value) return;

    if (mode === 'full') {
      // Switching from domains to full JSON: sync domains into content
      syncDomainsToJson();
      editMode.value = 'full';
      toast.info('已切换为全量 JSON 配置编辑模式');
    } else {
      // Switching from full JSON to domains: extract domains from content
      const ok = syncJsonToDomains();
      if (ok) {
        editMode.value = 'domains';
        toast.info('已切换为域名规则维护模式');
      }
    }
  }

  async function load() {
    loading.value = true;
    try {
      const data = await fetchConfig();
      domains.value = Array.isArray(data.domains) ? [...data.domains] : [];
      originalDomains.value = [...domains.value];
      content.value = data.formatted || data.content;
      originalContent.value = content.value;
      configPath.value = data.configPath;
      latestHistory.value = data.latestHistory || null;
      checkJsonValidity(content.value);
    } catch (err: any) {
      toast.error(`读取配置失败: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }

  function addDomain(input: string): { success: boolean; message?: string } {
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, message: '域名不能为空' };
    }

    const normalized = normalizeDomainStr(trimmed);
    if (!DOMAIN_REGEX.test(normalized)) {
      return {
        success: false,
        message: '域名格式无效，必须以 domain: 开头且后缀为有效域名，如 domain:openai.com',
      };
    }

    if (domains.value.includes(normalized)) {
      return { success: false, message: `域名 [${normalized}] 已存在列表中，请勿重复添加` };
    }

    domains.value.push(normalized);
    // sync to content
    syncDomainsToJson();
    return { success: true };
  }

  function batchAddDomains(text: string): { addedCount: number; duplicateCount: number; invalidCount: number } {
    const lines = text
      .split(/[\n,;\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const raw of lines) {
      const normalized = normalizeDomainStr(raw);
      if (!DOMAIN_REGEX.test(normalized)) {
        invalidCount++;
        continue;
      }
      if (domains.value.includes(normalized)) {
        duplicateCount++;
        continue;
      }
      domains.value.push(normalized);
      addedCount++;
    }

    if (addedCount > 0) {
      syncDomainsToJson();
    }

    return { addedCount, duplicateCount, invalidCount };
  }

  function updateDomain(index: number, newRaw: string): { success: boolean; message?: string } {
    const normalized = normalizeDomainStr(newRaw);
    if (!DOMAIN_REGEX.test(normalized)) {
      return {
        success: false,
        message: '域名格式无效，必须以 domain: 开头且后缀为有效域名',
      };
    }

    const existingIdx = domains.value.indexOf(normalized);
    if (existingIdx !== -1 && existingIdx !== index) {
      return { success: false, message: `域名 [${normalized}] 已存在` };
    }

    domains.value[index] = normalized;
    syncDomainsToJson();
    return { success: true };
  }

  function removeDomain(index: number) {
    domains.value.splice(index, 1);
    syncDomainsToJson();
  }

  function sortDomains() {
    domains.value.sort((a, b) => a.localeCompare(b));
    syncDomainsToJson();
    toast.info('域名列表已按字母顺序 A-Z 排序');
  }

  function deduplicateDomains() {
    const originalLen = domains.value.length;
    domains.value = Array.from(new Set(domains.value));
    const removed = originalLen - domains.value.length;
    if (removed > 0) {
      syncDomainsToJson();
      toast.info(`已清理 ${removed} 个重复域名`);
    } else {
      toast.info('未发现重复域名');
    }
  }

  function resetToOriginal() {
    domains.value = [...originalDomains.value];
    content.value = originalContent.value;
    checkJsonValidity(content.value);
    toast.info('已放弃所有未保存修改，恢复至初始状态');
  }

  async function save(title?: string, description?: string): Promise<boolean> {
    saving.value = true;
    try {
      let res;
      if (editMode.value === 'domains') {
        res = await apiSaveConfig({
          domains: domains.value,
          title: title || `域名列表更新 (${domains.value.length} 个条目)`,
          description: description || `更新 routing.rules.domain 列表`,
        });
      } else {
        if (!checkJsonValidity(content.value)) {
          toast.error(`保存失败: ${jsonError.value}`);
          return false;
        }
        res = await apiSaveConfig({
          content: content.value,
          title: title || `全量配置更新 (${new Date().toLocaleTimeString()})`,
          description: description || `手动编辑保存完整 config.json`,
        });
      }

      if (res.domains) {
        domains.value = [...res.domains];
        originalDomains.value = [...res.domains];
      }
      if (res.content) {
        content.value = res.content;
        originalContent.value = res.content;
      }
      latestHistory.value = res.history;
      toast.success(res.message || '配置已成功保存并生成维护记录！');
      return true;
    } catch (err: any) {
      toast.error(`保存失败: ${err.message}`);
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    editMode,
    domains,
    originalDomains,
    content,
    originalContent,
    configPath,
    latestHistory,
    loading,
    saving,
    jsonError,
    isValidJson,
    isDirty,
    domainsAsText,
    originalDomainsAsText,
    load,
    setContent,
    formatJson,
    switchEditMode,
    syncDomainsToJson,
    syncJsonToDomains,
    addDomain,
    batchAddDomains,
    updateDomain,
    removeDomain,
    sortDomains,
    deduplicateDomains,
    resetToOriginal,
    save,
  };
});
