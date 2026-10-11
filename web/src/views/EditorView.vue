<template>
  <div class="h-full flex flex-col space-y-3">
    <!-- Top Action Toolbar -->
    <div class="bg-base-100 p-2.5 sm:p-3 rounded-xl border border-base-300 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <!-- Left: Mode Switcher Tabs & Status -->
      <div class="flex items-center justify-between sm:justify-start gap-2">
        <!-- Edit Mode Tabs: Domains vs Full Config -->
        <div class="tabs tabs-boxed bg-base-200/90 p-0.5 border border-base-300 flex-1 sm:flex-initial flex">
          <button
            class="tab tab-xs sm:tab-sm flex-1 sm:flex-initial gap-1 transition-all"
            :class="{ 'tab-active font-bold': configStore.editMode === 'domains' }"
            @click="configStore.switchEditMode('domains')"
          >
            <span>🌐 域名规则</span>
            <span
              v-if="configStore.editMode === 'domains'"
              class="badge badge-primary badge-xs font-mono ml-0.5"
            >
              {{ configStore.domains.length }}
            </span>
          </button>
          <button
            class="tab tab-xs sm:tab-sm flex-1 sm:flex-initial gap-1 transition-all"
            :class="{ 'tab-active font-bold': configStore.editMode === 'full' }"
            @click="configStore.switchEditMode('full')"
          >
            <span>📝 全量配置</span>
            <span
              v-if="configStore.editMode === 'full'"
              class="badge badge-xs ml-0.5"
              :class="configStore.isValidJson ? 'badge-success' : 'badge-error'"
            >
              {{ configStore.isValidJson ? 'JSON' : 'Err' }}
            </span>
          </button>
        </div>

        <!-- Status Pill: Desktop only -->
        <div v-if="configStore.isDirty" class="badge badge-warning badge-sm gap-1 animate-pulse hidden sm:inline-flex text-xs">
          ● 未保存
        </div>
        <div v-else class="badge badge-ghost badge-sm text-success gap-1 hidden sm:inline-flex text-xs">
          ✓ 同步
        </div>
      </div>

      <!-- Right Action Buttons -->
      <div class="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap">
        <!-- Desktop-only Tool buttons -->
        <div class="hidden sm:flex items-center gap-1.5">
          <!-- Domains Mode Actions -->
          <template v-if="configStore.editMode === 'domains'">
            <button
              @click="configStore.sortDomains"
              class="btn btn-xs btn-outline"
              title="按字母 A-Z 顺序排列域名"
            >
              A-Z 排序
            </button>
            <button
              @click="configStore.deduplicateDomains"
              class="btn btn-xs btn-outline"
              title="清理重复的域名"
            >
              去重
            </button>
          </template>

          <!-- Full Config Mode Actions -->
          <template v-else>
            <button
              @click="configStore.formatJson"
              class="btn btn-xs btn-outline"
              title="格式化并美化 JSON 缩进"
            >
              格式化
            </button>
          </template>

          <!-- Discard Changes -->
          <button
            v-if="configStore.isDirty"
            @click="configStore.resetToOriginal"
            class="btn btn-xs btn-ghost text-error"
            title="放弃未保存修改"
          >
            放弃
          </button>

          <!-- View Diff -->
          <button
            v-if="configStore.isDirty"
            @click="showLocalDiff = true"
            class="btn btn-xs btn-outline btn-warning gap-1"
            title="查看改动差异"
          >
            Diff
          </button>

          <div class="divider divider-horizontal my-0 mx-0.5"></div>
        </div>

        <!-- Mobile More Menu Dropdown -->
        <div class="dropdown sm:hidden">
          <div tabindex="0" role="button" class="btn btn-xs btn-outline gap-1">
            <span>操作</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <ul tabindex="0" class="dropdown-content z-30 menu p-2 shadow-lg bg-base-200 rounded-box w-36 text-xs">
            <template v-if="configStore.editMode === 'domains'">
              <li><a @click="configStore.sortDomains">🔤 A-Z 排序</a></li>
              <li><a @click="configStore.deduplicateDomains">🧹 清理重复</a></li>
            </template>
            <template v-else>
              <li><a @click="configStore.formatJson">✨ 格式化 JSON</a></li>
            </template>
            <li v-if="configStore.isDirty">
              <a @click="showLocalDiff = true" class="text-warning">📊 查看 Diff 改动</a>
            </li>
            <li v-if="configStore.isDirty">
              <a @click="configStore.resetToOriginal" class="text-error">↺ 放弃所有修改</a>
            </li>
          </ul>
        </div>

        <!-- SSH Pull Button -->
        <button
          @click="showPullModal = true"
          class="btn btn-xs btn-outline btn-secondary gap-1"
          title="从远程服务器拉取"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>拉取</span>
        </button>

        <!-- SSH Push Button -->
        <button
          @click="showPushModal = true"
          class="btn btn-xs btn-outline btn-accent gap-1"
          title="推送至服务器"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>推送</span>
        </button>

        <!-- Save Button -->
        <button
          @click="openSaveDialog"
          :disabled="configStore.saving || (configStore.editMode === 'full' && !configStore.isValidJson)"
          class="btn btn-xs btn-primary gap-1"
        >
          <span v-if="configStore.saving" class="loading loading-spinner loading-xs"></span>
          <span>保存</span>
        </button>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODE 1: DOMAIN LIST MAINTENANCE MODE           -->
    <!-- ============================================== -->
    <template v-if="configStore.editMode === 'domains'">
      <!-- Add Domain Form & Filter Bar -->
      <div class="bg-base-100 p-3 sm:p-4 rounded-xl border border-base-300 shadow-sm space-y-2.5">
        <!-- Add Domain Input Box with domain: prefix -->
        <div class="flex items-center">
          <div class="join w-full">
            <span class="join-item btn btn-xs sm:btn-sm btn-neutral no-animation font-mono font-bold text-xs select-none px-2 sm:px-3">
              domain:
            </span>
            <input
              v-model="newDomainInput"
              @keydown.enter.prevent="handleAddDomain"
              type="text"
              placeholder="输入域名，如 openai.com"
              class="join-item input input-xs sm:input-sm input-bordered bg-base-200 flex-1 font-mono text-xs"
            />
            <button
              @click="handleAddDomain"
              class="join-item btn btn-xs sm:btn-sm btn-primary px-3 sm:px-4"
            >
              <span>+ 添加</span>
            </button>
          </div>
        </div>

        <!-- Filter and Batch Row -->
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <button
            @click="showBatchModal = true"
            class="btn btn-xs btn-outline btn-info gap-1 text-[11px]"
            title="批量导入"
          >
            <span>批量导入</span>
          </button>

          <!-- Search Filter -->
          <div class="relative flex-1 max-w-[220px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索列表..."
              class="input input-xs input-bordered bg-base-200 w-full pl-6 text-xs"
            />
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 absolute left-1.5 top-2 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Domain List Table (Optimized for Mobile) -->
      <div class="flex-1 bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden flex flex-col">
        <div class="overflow-x-auto flex-1">
          <table class="table table-xs sm:table-sm table-pin-rows">
            <thead>
              <tr class="bg-base-200/70 text-xs">
                <th class="w-10 sm:w-14 text-center">#</th>
                <th>域名规则</th>
                <th class="hidden md:table-cell">纯域名</th>
                <th class="w-28 sm:w-36 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredDomains.length === 0" class="hover:bg-transparent">
                <td colspan="4" class="text-center py-10 text-base-content/40">
                  <div class="flex flex-col items-center justify-center space-y-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xs">{{ searchQuery ? '未找到匹配域名' : '列表为空，请在上方添加' }}</span>
                  </div>
                </td>
              </tr>

              <tr
                v-for="item in filteredDomains"
                :key="item.index"
                class="hover:bg-base-200/50 transition-colors"
              >
                <!-- Index Number -->
                <td class="text-center font-mono text-[11px] opacity-50 px-1">
                  {{ item.index + 1 }}
                </td>

                <!-- Rule String: compact with highlighted prefix -->
                <td class="font-mono text-xs">
                  <!-- Inline Editing mode -->
                  <div v-if="editingIndex === item.index" class="flex items-center gap-1.5">
                    <span class="text-primary font-bold">domain:</span>
                    <input
                      v-model="editDomainInput"
                      @keydown.enter="handleSaveEdit(item.index)"
                      @keydown.esc="editingIndex = null"
                      type="text"
                      class="input input-xs input-bordered bg-base-100 font-mono text-xs flex-1 min-w-[120px]"
                      autofocus
                    />
                    <button @click="handleSaveEdit(item.index)" class="btn btn-xs btn-success px-1.5">✓</button>
                    <button @click="editingIndex = null" class="btn btn-xs btn-ghost px-1">✕</button>
                  </div>

                  <!-- Normal display mode -->
                  <div v-else class="flex items-center gap-1 truncate select-all">
                    <span class="text-primary font-bold">domain:</span><span class="font-medium text-base-content">{{ item.pureDomain }}</span>
                  </div>
                </td>

                <!-- Pure Domain (Desktop only, hidden on mobile) -->
                <td class="hidden md:table-cell font-mono text-xs opacity-75 select-all">
                  {{ item.pureDomain }}
                </td>

                <!-- Actions: Compact and touch friendly -->
                <td class="text-right whitespace-nowrap px-1 sm:px-3">
                  <div class="inline-flex items-center gap-0.5 sm:gap-1">
                    <!-- Copy -->
                    <button
                      @click="copyToClipboard(item.full)"
                      class="btn btn-ghost btn-xs px-1 sm:px-2 text-base-content/60"
                      title="复制完整规则"
                    >
                      <span class="hidden sm:inline">复制</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    <!-- Edit -->
                    <button
                      @click="startEdit(item.index, item.pureDomain)"
                      class="btn btn-ghost btn-xs px-1 sm:px-2 text-primary"
                      title="修改此域名"
                    >
                      <span class="hidden sm:inline">编辑</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <!-- Delete -->
                    <button
                      @click="configStore.removeDomain(item.index)"
                      class="btn btn-ghost btn-xs px-1 sm:px-2 text-error"
                      title="删除此域名"
                    >
                      <span class="hidden sm:inline">删除</span>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ============================================== -->
    <!-- MODE 2: FULL CONFIG JSON EDITING MODE          -->
    <!-- ============================================== -->
    <template v-else>
      <!-- JSON Error Alert Banner if invalid -->
      <div
        v-if="!configStore.isValidJson"
        class="alert alert-error py-1.5 px-3 text-xs rounded-lg shadow-sm flex items-center justify-between"
      >
        <div class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="truncate">语法错误：{{ configStore.jsonError }}</span>
        </div>
      </div>

      <!-- CodeMirror Full JSON Editor -->
      <div class="flex-1 min-h-[450px]">
        <CodeEditor
          v-model="configStore.content"
          @change="configStore.setContent"
        />
      </div>
    </template>

    <!-- Batch Import Modal -->
    <dialog class="modal" :class="{ 'modal-open': showBatchModal }">
      <div class="modal-box w-11/12 max-w-xl bg-base-200 p-4 sm:p-5">
        <div class="flex items-center justify-between pb-2 border-b border-base-300">
          <h3 class="font-bold text-base">批量导入域名</h3>
          <button @click="showBatchModal = false" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="py-2.5 space-y-2">
          <p class="text-xs text-base-content/70">
            支持粘贴多个域名，每行一个或逗号分隔，自动补齐 <code class="text-primary font-bold font-mono">domain:</code> 前缀并去重。
          </p>

          <textarea
            v-model="batchInput"
            rows="7"
            placeholder="openai.com&#10;chatgpt.com&#10;domain:anthropic.com"
            class="textarea textarea-bordered textarea-sm w-full font-mono text-xs bg-base-100"
          ></textarea>
        </div>

        <div class="modal-action pt-2 flex justify-end gap-2 border-t border-base-300">
          <button @click="showBatchModal = false" class="btn btn-sm btn-ghost">取消</button>
          <button
            @click="handleBatchAdd"
            :disabled="!batchInput.trim()"
            class="btn btn-sm btn-primary"
          >
            确认导入
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showBatchModal = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- Save Dialog Modal -->
    <dialog class="modal" :class="{ 'modal-open': showSaveModal }">
      <div class="modal-box w-11/12 max-w-md bg-base-200 p-4 sm:p-5">
        <h3 class="font-bold text-base mb-2.5">保存配置并记入历史</h3>

        <form @submit.prevent="confirmSave" class="space-y-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">维护记录标题 <span class="text-error">*</span></span>
            </label>
            <input
              v-model="saveTitle"
              type="text"
              required
              :placeholder="configStore.editMode === 'domains' ? '例如：更新 OpenAI 路由域名' : '例如：更新端口与出站配置'"
              class="input input-sm input-bordered bg-base-100"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">详细说明 (可选)</span>
            </label>
            <textarea
              v-model="saveDescription"
              rows="3"
              placeholder="记录本次改动原因或细节..."
              class="textarea textarea-bordered textarea-sm bg-base-100 text-xs"
            ></textarea>
          </div>

          <div class="modal-action pt-2 flex justify-end gap-2">
            <button type="button" @click="showSaveModal = false" class="btn btn-sm btn-ghost">
              取消
            </button>
            <button
              type="submit"
              :disabled="configStore.saving"
              class="btn btn-sm btn-primary"
            >
              <span v-if="configStore.saving" class="loading loading-spinner loading-xs"></span>
              <span>确认保存</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showSaveModal = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- Diff Modal for Draft vs Saved -->
    <DiffModal
      :open="showLocalDiff"
      :title="configStore.editMode === 'domains' ? '域名列表改动 Diff' : '全量 config.json 改动 Diff'"
      :old-string="configStore.editMode === 'domains' ? configStore.originalDomainsAsText : configStore.originalContent"
      :new-string="configStore.editMode === 'domains' ? configStore.domainsAsText : configStore.content"
      :old-label="configStore.editMode === 'domains' ? '已保存域名' : '已保存文件'"
      :new-label="configStore.editMode === 'domains' ? '当前编辑草稿' : '当前草稿'"
      @close="showLocalDiff = false"
    />

    <!-- Push Modal -->
    <PushModal
      :open="showPushModal"
      :content="configStore.content"
      @close="showPushModal = false"
      @pushed="handlePushed"
    />

    <!-- Pull Modal -->
    <PullModal
      :open="showPullModal"
      :local-content="configStore.content"
      @close="showPullModal = false"
      @applied="handlePulledApplied"
      @saved="handlePulledSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useConfigStore } from '../stores/config.js';
import { useServersStore } from '../stores/servers.js';
import { useToastStore } from '../stores/toast.js';
import CodeEditor from '../components/CodeEditor.vue';
import DiffModal from '../components/DiffModal.vue';
import PushModal from '../components/PushModal.vue';
import PullModal from '../components/PullModal.vue';

const configStore = useConfigStore();
const serversStore = useServersStore();
const toast = useToastStore();

const newDomainInput = ref('');
const searchQuery = ref('');

const showSaveModal = ref(false);
const showBatchModal = ref(false);
const showLocalDiff = ref(false);
const showPushModal = ref(false);
const showPullModal = ref(false);

const batchInput = ref('');
const saveTitle = ref('');
const saveDescription = ref('');

const editingIndex = ref<number | null>(null);
const editDomainInput = ref('');

onMounted(async () => {
  await configStore.load();
  await serversStore.loadServers();
});

// Computed list with search filtering and parsed domain info
const filteredDomains = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return configStore.domains
    .map((full, index) => {
      const pureDomain = full.startsWith('domain:') ? full.substring(7) : full;
      return { full, pureDomain, index };
    })
    .filter((item) => {
      if (!query) return true;
      return (
        item.full.toLowerCase().includes(query) ||
        item.pureDomain.toLowerCase().includes(query)
      );
    });
});

function handleAddDomain() {
  const val = newDomainInput.value.trim();
  if (!val) return;

  const res = configStore.addDomain(val);
  if (res.success) {
    newDomainInput.value = '';
    toast.success('域名添加成功');
  } else {
    toast.error(res.message || '添加失败');
  }
}

function handleBatchAdd() {
  const res = configStore.batchAddDomains(batchInput.value);
  batchInput.value = '';
  showBatchModal.value = false;

  if (res.addedCount > 0) {
    toast.success(
      `成功导入 ${res.addedCount} 个域名！` +
        (res.duplicateCount > 0 ? ` (已跳过 ${res.duplicateCount} 个重复项)` : '') +
        (res.invalidCount > 0 ? ` (已跳过 ${res.invalidCount} 个非法格式)` : '')
    );
  } else {
    toast.warning('未导入任何有效新域名');
  }
}

function startEdit(index: number, pureDomain: string) {
  editingIndex.value = index;
  editDomainInput.value = pureDomain;
}

function handleSaveEdit(index: number) {
  const res = configStore.updateDomain(index, editDomainInput.value);
  if (res.success) {
    editingIndex.value = null;
    toast.success('域名修改成功');
  } else {
    toast.error(res.message || '修改失败');
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.info(`已复制: ${text}`);
}

function openSaveDialog() {
  if (configStore.editMode === 'domains') {
    saveTitle.value = `更新域名列表 (${configStore.domains.length} 个条目)`;
  } else {
    saveTitle.value = `全量配置更新 (${new Date().toLocaleTimeString()})`;
  }
  saveDescription.value = '';
  showSaveModal.value = true;
}

async function confirmSave() {
  const ok = await configStore.save(saveTitle.value, saveDescription.value);
  if (ok) {
    showSaveModal.value = false;
  }
}

function handlePushed() {
  configStore.load();
}

function handlePulledApplied(_pulledContent: string) {
  configStore.load();
}

function handlePulledSaved() {
  configStore.load();
}
</script>
