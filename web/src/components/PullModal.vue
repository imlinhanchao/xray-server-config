<template>
  <dialog class="modal" :class="{ 'modal-open': open }">
    <div class="modal-box w-11/12 max-w-5xl max-h-[92vh] flex flex-col bg-base-200 p-6">
      <div class="flex items-center justify-between border-b border-base-300 pb-3 mb-4">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="badge badge-secondary">SSH 远程拉取</span>
          <span>从服务器获取最新配置</span>
        </h3>
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </div>

      <div v-if="servers.length === 0" class="py-6 text-center">
        <p class="text-base-content/70 mb-4">暂无已配置的目标服务器，请先在服务器管理中添加服务器。</p>
        <router-link to="/servers" class="btn btn-sm btn-primary">前往添加服务器</router-link>
      </div>

      <div v-else class="flex-1 flex flex-col overflow-hidden space-y-4">
        <!-- Step 1: Server Selection Bar -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">选择源服务器</span>
            </label>
            <select
              v-model="selectedServerId"
              class="select select-sm select-bordered bg-base-100"
            >
              <option disabled value="">请选择服务器</option>
              <option v-for="srv in servers" :key="srv.id" :value="srv.id">
                {{ srv.name }} ({{ srv.host }})
              </option>
            </select>
          </div>

          <div class="form-control md:col-span-2">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">远程文件路径</span>
            </label>
            <div class="flex gap-2">
              <input
                v-model="customRemotePath"
                type="text"
                class="input input-sm input-bordered bg-base-100 flex-1 font-mono text-xs"
              />
              <button
                @click="handlePull"
                :disabled="loading || !selectedServerId"
                class="btn btn-sm btn-secondary gap-1"
              >
                <span v-if="loading" class="loading loading-spinner loading-xs"></span>
                <span>拉取配置</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Pulled content with Diff comparison against local -->
        <div v-if="pulledContent !== null" class="flex-1 flex flex-col overflow-hidden border border-base-300 rounded-lg bg-base-100 p-3">
          <div class="flex items-center justify-between pb-2 border-b border-base-300 text-xs">
            <div class="flex items-center gap-2">
              <span class="badge badge-success badge-sm">已成功拉取</span>
              <span class="text-base-content/70">
                对比结果: 本地当前 vs 远程服务器 ({{ pulledDomains.length }} 个远端域名)
              </span>
            </div>

            <div class="flex items-center gap-2">
              <div class="join">
                <button
                  class="join-item btn btn-xs"
                  :class="diffMode === 'domains' ? 'btn-active btn-info' : 'btn-ghost'"
                  @click="diffMode = 'domains'"
                >
                  域名列表 Diff
                </button>
                <button
                  class="join-item btn btn-xs"
                  :class="diffMode === 'full' ? 'btn-active btn-info' : 'btn-ghost'"
                  @click="diffMode = 'full'"
                >
                  完整 JSON Diff
                </button>
              </div>

              <div class="join">
                <button
                  class="join-item btn btn-xs gap-1"
                  :class="effectiveTheme === 'dark' ? 'btn-active btn-neutral' : 'btn-ghost'"
                  @click="themeOverride = 'dark'"
                  title="暗色 Diff"
                >
                  🌙
                </button>
                <button
                  class="join-item btn btn-xs gap-1"
                  :class="effectiveTheme === 'light' ? 'btn-active btn-neutral' : 'btn-ghost'"
                  @click="themeOverride = 'light'"
                  title="亮色 Diff"
                >
                  ☀️
                </button>
              </div>

              <div class="join">
                <button
                  class="join-item btn btn-xs"
                  :class="outputFormat === 'side-by-side' ? 'btn-active btn-primary' : 'btn-ghost'"
                  @click="outputFormat = 'side-by-side'"
                >
                  分栏
                </button>
                <button
                  class="join-item btn btn-xs"
                  :class="outputFormat === 'line-by-line' ? 'btn-active btn-primary' : 'btn-ghost'"
                  @click="outputFormat = 'line-by-line'"
                >
                  逐行
                </button>
              </div>
            </div>
          </div>

          <div
            class="flex-1 overflow-auto my-2 rounded border border-base-300 transition-colors duration-200"
            :class="effectiveTheme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'"
          >
            <CodeDiff
              :old-string="diffMode === 'domains' ? localDomainsText : localContent"
              :new-string="diffMode === 'domains' ? pulledDomainsText : pulledContent"
              :output-format="outputFormat"
              diff-style="word"
              :language="diffMode === 'domains' ? 'plaintext' : 'json'"
              :theme="effectiveTheme"
              :filename="diffMode === 'domains' ? '本地域名列表' : '本地当前配置'"
              :new-filename="diffMode === 'domains' ? '远端域名列表' : '远程服务器配置'"
            />
          </div>

          <!-- Commit / Save to local section -->
          <div class="pt-2 border-t border-base-300 flex flex-wrap items-center justify-between gap-3">
            <div class="flex-1 min-w-[280px]">
              <input
                v-model="saveTitle"
                type="text"
                placeholder="维护日志标题 (如: 从 香港服务器 拉取并更新域名列表)"
                class="input input-sm input-bordered bg-base-200 w-full text-xs"
              />
            </div>
            <div class="flex gap-2">
              <button
                @click="applyToEditorDraft"
                class="btn btn-sm btn-outline"
              >
                仅载入到域名草稿列表
              </button>
              <button
                @click="applyAndSaveToLocal"
                :disabled="saving"
                class="btn btn-sm btn-primary gap-1"
              >
                <span v-if="saving" class="loading loading-spinner loading-xs"></span>
                <span>直接覆盖本地并入库</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CodeDiff } from 'v-code-diff';
import { useServersStore } from '../stores/servers.js';
import { useConfigStore } from '../stores/config.js';
import { useThemeStore } from '../stores/theme.js';
import { pullConfigFromServer } from '../api/ssh.js';
import { useToastStore } from '../stores/toast.js';

const props = defineProps<{
  open: boolean;
  localContent: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'applied', content: string): void;
  (e: 'saved'): void;
}>();

const serversStore = useServersStore();
const configStore = useConfigStore();
const themeStore = useThemeStore();
const toast = useToastStore();

const themeOverride = ref<'dark' | 'light' | null>(null);

const effectiveTheme = computed<'dark' | 'light'>(() => {
  if (themeOverride.value) {
    return themeOverride.value;
  }
  return themeStore.diffTheme;
});

const servers = computed(() => serversStore.servers);
const selectedServerId = ref<number | ''>('');
const customRemotePath = ref('');
const loading = ref(false);
const saving = ref(false);
const pulledContent = ref<string | null>(null);
const saveTitle = ref('');
const outputFormat = ref<'side-by-side' | 'line-by-line'>('side-by-side');
const diffMode = ref<'domains' | 'full'>('domains');

function extractDomains(jsonStr: string): string[] {
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

const pulledDomains = computed(() => {
  return pulledContent.value ? extractDomains(pulledContent.value) : [];
});

const pulledDomainsText = computed(() => {
  return pulledDomains.value.join('\n');
});

const localDomainsText = computed(() => {
  return configStore.domains.join('\n');
});

const selectedServer = computed(() =>
  servers.value.find((s) => s.id === selectedServerId.value)
);

watch(selectedServer, (srv) => {
  if (srv) {
    customRemotePath.value = srv.remote_path;
  }
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      pulledContent.value = null;
      if (servers.value.length > 0 && !selectedServerId.value) {
        selectedServerId.value = servers.value[0].id;
        customRemotePath.value = servers.value[0].remote_path;
      }
    }
  }
);

async function handlePull() {
  if (!selectedServerId.value) return;

  loading.value = true;
  try {
    const res = await pullConfigFromServer({
      server_id: Number(selectedServerId.value),
      custom_remote_path: customRemotePath.value || undefined,
      save_to_local: false,
    });

    if (res.success) {
      pulledContent.value = res.formatted || res.content;
      saveTitle.value = `从 ${selectedServer.value?.name || '服务器'} 拉取域名配置`;
      toast.success('远程配置拉取成功！请核对 Diff 差异');
    }
  } catch (err: any) {
    toast.error(`拉取失败: ${err.message}`);
  } finally {
    loading.value = false;
  }
}

function applyToEditorDraft() {
  if (!pulledContent.value) return;
  const domains = extractDomains(pulledContent.value);
  configStore.domains = domains;
  emit('applied', pulledContent.value);
  emit('close');
  toast.info(`已载入 ${domains.length} 个远端域名到当前草稿列表`);
}

async function applyAndSaveToLocal() {
  if (!pulledContent.value || !selectedServerId.value) return;

  saving.value = true;
  try {
    const res = await pullConfigFromServer({
      server_id: Number(selectedServerId.value),
      custom_remote_path: customRemotePath.value || undefined,
      save_to_local: true,
      title: saveTitle.value || `从 ${selectedServer.value?.name} 拉取并覆盖本地配置`,
    });

    if (res.success) {
      toast.success('配置已覆盖本地 config.json 并记入维护历史！');
      await configStore.load();
      emit('saved');
      emit('close');
    }
  } catch (err: any) {
    toast.error(`保存失败: ${err.message}`);
  } finally {
    saving.value = false;
  }
}
</script>
