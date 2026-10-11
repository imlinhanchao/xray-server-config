<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-3.5 sm:p-4 rounded-xl border border-base-300 shadow-sm">
      <div class="flex-1 min-w-[200px]">
        <h2 class="text-base font-bold flex items-center gap-2">
          <span>维护历史记录</span>
          <span class="badge badge-primary badge-sm font-mono">{{ historyStore.historyList.length }} 次</span>
        </h2>
        <p class="hidden sm:block text-xs text-base-content/60 mt-0.5">
          记录每次本地配置保存、远程拉取、服务器推送与回滚全量快照，支持使用 v-code-diff 进行对比核验
        </p>
      </div>

      <div class="flex items-center gap-2">
        <router-link to="/diff" class="btn btn-sm btn-outline btn-info gap-1 text-xs px-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>对比 (Diff)</span>
        </router-link>
        <button @click="() => historyStore.loadHistory()" class="btn btn-sm btn-ghost btn-circle" title="刷新历史">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Card View (hidden on md and larger) -->
    <div class="block md:hidden space-y-3">
      <div
        v-for="(item, index) in historyStore.historyList"
        :key="'mobile-' + item.id"
        class="bg-base-100 rounded-xl border border-base-300 p-3.5 shadow-sm space-y-2.5"
      >
        <!-- Header row: Version & Action Badge & Time -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="badge badge-primary badge-sm font-bold font-mono">v{{ item.version }}</span>
            <span
              class="badge badge-xs py-1.5 px-2 font-medium"
              :class="{
                'badge-primary': item.action_type === 'edit',
                'badge-secondary': item.action_type === 'pull',
                'badge-accent': item.action_type === 'push',
                'badge-warning': item.action_type === 'rollback',
                'badge-neutral': item.action_type === 'initial',
              }"
            >
              {{ formatActionType(item.action_type) }}
            </span>
          </div>
          <span class="text-[11px] text-base-content/50 font-mono">
            {{ formatRelativeOrTime(item.created_at) }}
          </span>
        </div>

        <!-- Title & Description -->
        <div>
          <div class="font-medium text-sm text-base-content">{{ item.title }}</div>
          <div v-if="item.description" class="text-xs text-base-content/60 mt-0.5 break-words line-clamp-2">
            {{ item.description }}
          </div>
        </div>

        <!-- Meta info (Operator & Server) -->
        <div class="flex items-center justify-between pt-1 text-[11px] text-base-content/60 border-t border-base-200">
          <div class="flex items-center gap-1.5">
            <span>👤 {{ item.operator }}</span>
            <span v-if="item.server_name" class="badge badge-ghost badge-xs">
              🖥️ {{ item.server_name }}
            </span>
          </div>

          <!-- Mobile Action Buttons -->
          <div class="flex items-center gap-1">
            <button
              v-if="index < historyStore.historyList.length - 1"
              @click="openDiffWithPrev(item, historyStore.historyList[index + 1])"
              class="btn btn-xs btn-outline btn-info px-2"
            >
              Diff
            </button>
            <button
              @click="openViewSnapshot(item.id)"
              class="btn btn-xs btn-ghost text-primary px-2"
            >
              查看
            </button>
            <button
              @click="handleRollback(item)"
              class="btn btn-xs btn-ghost text-warning px-2"
            >
              回滚
            </button>
          </div>
        </div>
      </div>

      <div v-if="historyStore.historyList.length === 0" class="text-center py-8 text-base-content/40 text-xs bg-base-100 rounded-xl border border-base-300">
        暂无维护历史记录
      </div>
    </div>

    <!-- Desktop Table View (hidden on screens smaller than md) -->
    <div class="hidden md:block bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr class="bg-base-200/50 text-xs">
              <th class="w-16">版本</th>
              <th class="w-24">操作类型</th>
              <th>维护标题与说明</th>
              <th class="w-28">关联服务器</th>
              <th class="w-20">操作人</th>
              <th class="w-40">时间</th>
              <th class="w-44 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in historyStore.historyList"
              :key="'desktop-' + item.id"
              class="hover:bg-base-200/40 transition-colors"
            >
              <!-- Version Badge -->
              <td>
                <span class="font-bold text-primary text-xs">v{{ item.version }}</span>
              </td>

              <!-- Action Type Badge -->
              <td>
                <span
                  class="badge badge-xs py-2 px-2 font-medium"
                  :class="{
                    'badge-primary': item.action_type === 'edit',
                    'badge-secondary': item.action_type === 'pull',
                    'badge-accent': item.action_type === 'push',
                    'badge-warning': item.action_type === 'rollback',
                    'badge-neutral': item.action_type === 'initial',
                  }"
                >
                  {{ formatActionType(item.action_type) }}
                </span>
              </td>

              <!-- Title & Description -->
              <td>
                <div class="font-medium text-xs">{{ item.title }}</div>
                <div v-if="item.description" class="text-[11px] text-base-content/60 truncate max-w-md">
                  {{ item.description }}
                </div>
              </td>

              <!-- Server -->
              <td class="text-xs">
                <span v-if="item.server_name" class="badge badge-ghost badge-sm text-[11px] truncate max-w-[120px]">
                  {{ item.server_name }}
                </span>
                <span v-else class="text-base-content/40 text-[11px]">-</span>
              </td>

              <!-- Operator -->
              <td class="text-xs text-base-content/70">
                {{ item.operator }}
              </td>

              <!-- Time -->
              <td class="text-[11px] text-base-content/60 font-mono">
                {{ formatDateTime(item.created_at) }}
              </td>

              <!-- Actions -->
              <td class="text-right space-x-1">
                <!-- Quick Diff with Previous Version -->
                <button
                  v-if="index < historyStore.historyList.length - 1"
                  @click="openDiffWithPrev(item, historyStore.historyList[index + 1])"
                  class="btn btn-xs btn-outline btn-info"
                  title="使用 v-code-diff 对比与上一版本差异"
                >
                  Diff
                </button>

                <!-- View Snapshot -->
                <button
                  @click="openViewSnapshot(item.id)"
                  class="btn btn-xs btn-ghost text-primary"
                >
                  查看
                </button>

                <!-- Rollback -->
                <button
                  @click="handleRollback(item)"
                  class="btn btn-xs btn-ghost text-warning"
                  title="将本地 config.json 回滚到此版本"
                >
                  回滚
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Snapshot Viewer Modal -->
    <dialog class="modal" :class="{ 'modal-open': showSnapshotModal }">
      <div class="modal-box w-11/12 max-w-4xl max-h-[90vh] flex flex-col bg-base-200 p-5">
        <div class="flex items-center justify-between pb-3 border-b border-base-300">
          <div class="flex items-center gap-2">
            <span class="badge badge-primary">v{{ viewingItem?.version }}</span>
            <h3 class="font-bold text-sm">{{ viewingItem?.title }}</h3>
          </div>
          <button @click="showSnapshotModal = false" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="flex-1 overflow-auto my-3 p-3 bg-base-100 rounded-lg border border-base-300">
          <pre class="font-mono text-xs">{{ viewingItem?.content }}</pre>
        </div>

        <div class="modal-action pt-2 flex justify-between items-center border-t border-base-300">
          <span class="text-xs text-base-content/60">保存时间: {{ viewingItem ? formatDateTime(viewingItem.created_at) : '' }}</span>
          <div class="flex gap-2">
            <button @click="showSnapshotModal = false" class="btn btn-sm btn-ghost">关闭</button>
            <button
              v-if="viewingItem"
              @click="handleRollback(viewingItem)"
              class="btn btn-sm btn-warning"
            >
              回滚至此版本
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showSnapshotModal = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- Quick Diff Modal -->
    <DiffModal
      :open="showDiffModal"
      :title="diffTitle"
      :old-string="diffOldString"
      :new-string="diffNewString"
      :old-label="diffOldLabel"
      :new-label="diffNewLabel"
      @close="showDiffModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useHistoryStore } from '../stores/history.js';
import { useConfigStore } from '../stores/config.js';
import { HistoryItem } from '../types/index.js';
import DiffModal from '../components/DiffModal.vue';

const historyStore = useHistoryStore();
const configStore = useConfigStore();

const showSnapshotModal = ref(false);
const viewingItem = ref<HistoryItem | null>(null);

const showDiffModal = ref(false);
const diffTitle = ref('');
const diffOldString = ref('');
const diffNewString = ref('');
const diffOldLabel = ref('');
const diffNewLabel = ref('');

onMounted(() => {
  historyStore.loadHistory();
});

function formatActionType(type: string): string {
  const map: Record<string, string> = {
    edit: '本地保存',
    pull: '远程拉取',
    push: '远程推送',
    rollback: '版本回滚',
    initial: '初始建立',
  };
  return map[type] || type;
}

function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString();
  } catch {
    return isoStr;
  }
}

function formatRelativeOrTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  } catch {
    return isoStr;
  }
}

async function openViewSnapshot(id: number) {
  const item = await historyStore.loadDetail(id);
  if (item) {
    viewingItem.value = item;
    showSnapshotModal.value = true;
  }
}

async function openDiffWithPrev(current: HistoryItem, previous: HistoryItem) {
  const [currDetail, prevDetail] = await Promise.all([
    historyStore.loadDetail(current.id),
    historyStore.loadDetail(previous.id),
  ]);

  if (currDetail && prevDetail) {
    diffTitle.value = `版本对比：v${previous.version} -> v${current.version}`;
    diffOldString.value = prevDetail.content || '';
    diffNewString.value = currDetail.content || '';
    diffOldLabel.value = `v${previous.version} (${previous.title})`;
    diffNewLabel.value = `v${current.version} (${current.title})`;
    showDiffModal.value = true;
  }
}

async function handleRollback(item: HistoryItem) {
  if (confirm(`确定要将当前本地配置回滚到版本 [v${item.version} - ${item.title}] 吗？`)) {
    const success = await historyStore.rollback(item.id);
    if (success) {
      showSnapshotModal.value = false;
      await configStore.load();
    }
  }
}
</script>
