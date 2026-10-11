<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-4 rounded-xl border border-base-300 shadow-sm">
      <div>
        <h2 class="text-base font-bold flex items-center gap-2">
          <span>目标服务器管理</span>
          <span class="badge badge-primary badge-sm">{{ serversStore.servers.length }} 台</span>
        </h2>
        <p class="text-xs text-base-content/60 mt-0.5">
          配置并维护用于远程推送与拉取 Xray 配置的服务器集群，支持密码与 SSH-Key 密钥认证
        </p>
      </div>

      <div class="flex gap-2">
        <button @click="() => serversStore.loadServers()" class="btn btn-sm btn-ghost btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button @click="openAddModal" class="btn btn-sm btn-primary gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>添加服务器</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="serversStore.servers.length === 0 && !serversStore.loading" class="card bg-base-100 border border-base-300 p-8 text-center">
      <div class="max-w-md mx-auto space-y-3">
        <div class="p-3 bg-base-200 inline-block rounded-full text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 class="font-bold text-sm">暂未添加任何服务器</h3>
        <p class="text-xs text-base-content/60">
          点击右上角“添加服务器”按钮，录入目标主机 IP、SSH 端口、用户名及密码或 SSH 私钥。
        </p>
        <button @click="openAddModal" class="btn btn-sm btn-primary">立即添加第一台服务器</button>
      </div>
    </div>

    <!-- Server Grid Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="server in serversStore.servers"
        :key="server.id"
        class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="card-body p-4 flex flex-col justify-between">
          <!-- Card Top: Name & Badges -->
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 class="font-bold text-sm text-base-content">{{ server.name }}</h3>
                <p class="font-mono text-xs text-base-content/70 flex items-center gap-1 mt-0.5">
                  <span>{{ server.username }}@{{ server.host }}:{{ server.port }}</span>
                </p>
              </div>

              <span
                class="badge badge-xs font-medium py-2 px-2"
                :class="server.auth_type === 'password' ? 'badge-info' : 'badge-accent'"
              >
                {{ server.auth_type === 'password' ? '密码认证' : 'SSH-Key' }}
              </span>
            </div>

            <p v-if="server.description" class="text-xs text-base-content/60 mb-3 line-clamp-2">
              {{ server.description }}
            </p>

            <!-- Details List -->
            <div class="bg-base-200/60 rounded-lg p-2.5 text-xs space-y-1.5 font-mono mb-3">
              <div class="flex justify-between items-center text-[11px]">
                <span class="text-base-content/50">远程目标路径:</span>
                <span class="truncate max-w-[160px] text-primary" :title="server.remote_path">
                  {{ server.remote_path }}
                </span>
              </div>
              <div v-if="server.post_command" class="flex justify-between items-center text-[11px]">
                <span class="text-base-content/50">生效命令:</span>
                <span class="truncate max-w-[160px] opacity-80" :title="server.post_command">
                  {{ server.post_command }}
                </span>
              </div>
            </div>

            <!-- Test Connection Status if any -->
            <div
              v-if="testStatuses[server.id]"
              class="p-2 rounded text-[11px] mb-3"
              :class="testStatuses[server.id]?.success ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
            >
              <span>{{ testStatuses[server.id]?.message }}</span>
            </div>
          </div>

          <!-- Card Bottom Actions -->
          <div class="pt-2 border-t border-base-300 flex items-center justify-between gap-2">
            <!-- Left: Test Connection -->
            <button
              @click="handleTestServer(server.id)"
              :disabled="testingIds.includes(server.id)"
              class="btn btn-xs btn-outline gap-1"
            >
              <span v-if="testingIds.includes(server.id)" class="loading loading-spinner loading-xs"></span>
              <span>测试连接</span>
            </button>

            <!-- Right: Edit / Delete -->
            <div class="flex items-center gap-1">
              <button
                @click="openEditModal(server)"
                class="btn btn-xs btn-ghost text-primary"
              >
                编辑
              </button>
              <button
                @click="handleDelete(server)"
                class="btn btn-xs btn-ghost text-error"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Server Add / Edit Modal -->
    <ServerModal
      :open="showModal"
      :server="editingServer"
      @close="showModal = false"
      @saved="serversStore.loadServers"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useServersStore } from '../stores/servers.js';
import { Server, SshTestResult } from '../types/index.js';
import ServerModal from '../components/ServerModal.vue';

const serversStore = useServersStore();

const showModal = ref(false);
const editingServer = ref<Server | null>(null);

const testingIds = ref<number[]>([]);
const testStatuses = reactive<Record<number, SshTestResult>>({});

onMounted(() => {
  serversStore.loadServers();
});

function openAddModal() {
  editingServer.value = null;
  showModal.value = true;
}

function openEditModal(server: Server) {
  editingServer.value = server;
  showModal.value = true;
}

async function handleTestServer(id: number) {
  testingIds.value.push(id);
  delete testStatuses[id];
  try {
    const res = await serversStore.test(id);
    testStatuses[id] = res;
  } finally {
    testingIds.value = testingIds.value.filter((i) => i !== id);
  }
}

async function handleDelete(server: Server) {
  if (confirm(`确定要删除服务器 [${server.name}] 吗？`)) {
    await serversStore.remove(server.id);
  }
}
</script>
