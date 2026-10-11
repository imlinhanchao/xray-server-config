<template>
  <div class="h-full flex flex-col space-y-3">
    <!-- Header Controls -->
    <div class="bg-base-100 p-3.5 sm:p-4 rounded-xl border border-base-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <!-- Left: Title & Stats -->
      <div class="flex-1 min-w-[200px]">
        <h2 class="text-base font-bold flex items-center gap-2">
          <span>版本 Diff 对比</span>
          <span class="badge badge-primary badge-sm font-mono">v-code-diff</span>
        </h2>
        <p class="hidden sm:block text-xs text-base-content/60 mt-0.5">
          选择任意两个维护历史版本或当前本地草稿，实时查看域名清单与配置差异
        </p>
      </div>

      <!-- Right: Target Toggle & Swap -->
      <div class="flex items-center gap-2">
        <!-- Compare Target Toggle: Domain list vs Full JSON -->
        <div class="join">
          <button
            class="join-item btn btn-xs"
            :class="compareTarget === 'domains' ? 'btn-active btn-info' : 'btn-ghost'"
            @click="setCompareTarget('domains')"
          >
            域名列表
          </button>
          <button
            class="join-item btn btn-xs"
            :class="compareTarget === 'full' ? 'btn-active btn-info' : 'btn-ghost'"
            @click="setCompareTarget('full')"
          >
            完整配置
          </button>
        </div>

        <!-- Swap button -->
        <button
          @click="swapVersions"
          class="btn btn-xs btn-outline gap-1"
          title="互换对比基准与目标版本"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="hidden sm:inline">交换顺序</span>
        </button>
      </div>
    </div>

    <!-- Selectors Bar -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-base-100 p-3 rounded-xl border border-base-300">
      <!-- Left Version Selector (Old / Baseline) -->
      <div class="flex items-center gap-2 min-w-0">
        <span class="badge badge-error badge-xs shrink-0"></span>
        <label class="text-xs font-bold text-error shrink-0">旧版(基准):</label>
        <select
          v-model="leftSelectedId"
          @change="updateComparisons"
          class="select select-xs select-bordered bg-base-200 flex-1 min-w-0 w-full font-mono text-xs truncate"
        >
          <option value="draft">★ 当前本地未保存草稿</option>
          <option v-for="item in historyStore.historyList" :key="item.id" :value="item.id">
            v{{ item.version }} - {{ item.title }} ({{ formatTime(item.created_at) }})
          </option>
        </select>
      </div>

      <!-- Right Version Selector (New / Target) -->
      <div class="flex items-center gap-2 min-w-0">
        <span class="badge badge-success badge-xs shrink-0"></span>
        <label class="text-xs font-bold text-success shrink-0">新版(目标):</label>
        <select
          v-model="rightSelectedId"
          @change="updateComparisons"
          class="select select-xs select-bordered bg-base-200 flex-1 min-w-0 w-full font-mono text-xs truncate"
        >
          <option value="draft">★ 当前本地未保存草稿</option>
          <option v-for="item in historyStore.historyList" :key="item.id" :value="item.id">
            v{{ item.version }} - {{ item.title }} ({{ formatTime(item.created_at) }})
          </option>
        </select>
      </div>
    </div>

    <!-- Main Diff Viewport with responsive theme container -->
    <div
      class="flex-1 overflow-auto rounded-xl border border-base-300 p-2 shadow-inner min-h-[500px] transition-colors duration-200"
      :class="effectiveTheme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'"
    >
      <div v-if="loading" class="h-full flex items-center justify-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>

      <CodeDiff
        v-else
        :old-string="displayOldString"
        :new-string="displayNewString"
        :output-format="outputFormat"
        diff-style="word"
        :language="compareTarget === 'domains' ? 'plaintext' : 'json'"
        :theme="effectiveTheme"
        :filename="leftLabel"
        :new-filename="rightLabel"
        :hide-header="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CodeDiff } from 'v-code-diff';
import { useHistoryStore } from '../stores/history.js';
import { useConfigStore } from '../stores/config.js';
import { useThemeStore } from '../stores/theme.js';

const historyStore = useHistoryStore();
const configStore = useConfigStore();
const themeStore = useThemeStore();

// Follow theme store directly
const effectiveTheme = computed<'dark' | 'light'>(() => themeStore.diffTheme);

// Responsive output format: line-by-line on mobile (<768px), side-by-side on desktop
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
function handleResize() {
  windowWidth.value = window.innerWidth;
}
const outputFormat = computed<'side-by-side' | 'line-by-line'>(() => {
  return windowWidth.value < 768 ? 'line-by-line' : 'side-by-side';
});

const compareTarget = ref<'domains' | 'full'>('domains');
const loading = ref(false);

const leftSelectedId = ref<number | string>('');
const rightSelectedId = ref<number | string>('');

const leftFullJson = ref('');
const rightFullJson = ref('');
const leftLabel = ref('旧版本');
const rightLabel = ref('新版本');

function extractDomainsFromJson(jsonStr: string): string[] {
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

const displayOldString = computed(() => {
  if (compareTarget.value === 'domains') {
    return extractDomainsFromJson(leftFullJson.value).join('\n');
  }
  return leftFullJson.value;
});

const displayNewString = computed(() => {
  if (compareTarget.value === 'domains') {
    return extractDomainsFromJson(rightFullJson.value).join('\n');
  }
  return rightFullJson.value;
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
  loading.value = true;
  try {
    await historyStore.loadHistory();
    await configStore.load();

    const list = historyStore.historyList;
    if (list.length >= 2) {
      leftSelectedId.value = list[1].id;
      rightSelectedId.value = list[0].id;
    } else if (list.length === 1) {
      leftSelectedId.value = list[0].id;
      rightSelectedId.value = 'draft';
    } else {
      leftSelectedId.value = 'draft';
      rightSelectedId.value = 'draft';
    }

    await updateComparisons();
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});

function setCompareTarget(target: 'domains' | 'full') {
  compareTarget.value = target;
}

async function updateComparisons() {
  // Load left
  if (leftSelectedId.value === 'draft') {
    leftFullJson.value = generateJsonWithDomains(configStore.domains);
    leftLabel.value = '当前本地编辑草稿';
  } else {
    const item = await historyStore.loadDetail(Number(leftSelectedId.value));
    if (item) {
      leftFullJson.value = item.content || '';
      leftLabel.value = `v${item.version} - ${item.title}`;
    }
  }

  // Load right
  if (rightSelectedId.value === 'draft') {
    rightFullJson.value = generateJsonWithDomains(configStore.domains);
    rightLabel.value = '当前本地编辑草稿';
  } else {
    const item = await historyStore.loadDetail(Number(rightSelectedId.value));
    if (item) {
      rightFullJson.value = item.content || '';
      rightLabel.value = `v${item.version} - ${item.title}`;
    }
  }
}

function generateJsonWithDomains(domains: string[]): string {
  try {
    const parsed = JSON.parse(configStore.content || '{}');
    if (!parsed.routing) parsed.routing = { domainStrategy: 'AsIs', rules: [] };
    if (!Array.isArray(parsed.routing.rules)) parsed.routing.rules = [];

    const targetRule = parsed.routing.rules.find((r: any) => Array.isArray(r.domain));
    if (targetRule) {
      targetRule.domain = domains;
    } else {
      parsed.routing.rules.unshift({
        type: 'field',
        outboundTag: 'warp-out',
        domain: domains,
      });
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return configStore.content;
  }
}

async function swapVersions() {
  const tempId = leftSelectedId.value;
  leftSelectedId.value = rightSelectedId.value;
  rightSelectedId.value = tempId;

  await updateComparisons();
}
</script>
