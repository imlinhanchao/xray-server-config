<template>
  <dialog class="modal" :class="{ 'modal-open': open }">
    <div class="modal-box w-11/12 max-w-2xl bg-base-200 p-6">
      <div class="flex items-center justify-between border-b border-base-300 pb-3 mb-4">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span class="badge badge-primary">SSH 远程拷贝</span>
          <span>推送当前配置到指定服务器</span>
        </h3>
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </div>

      <div v-if="servers.length === 0" class="py-6 text-center">
        <p class="text-base-content/70 mb-4">暂无已配置的目标服务器，请先在服务器管理中添加服务器。</p>
        <router-link to="/servers" class="btn btn-sm btn-primary">前往添加服务器</router-link>
      </div>

      <form v-else @submit.prevent="handlePush" class="space-y-4">
        <!-- Target Server Select -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">选择目标服务器 <span class="text-error">*</span></span>
          </label>
          <select
            v-model="selectedServerId"
            required
            class="select select-sm select-bordered bg-base-100"
          >
            <option disabled value="">请选择目标服务器</option>
            <option v-for="srv in servers" :key="srv.id" :value="srv.id">
              {{ srv.name }} ({{ srv.host }}:{{ srv.port }}) - {{ srv.remote_path }}
            </option>
          </select>
        </div>

        <div v-if="selectedServer" class="bg-base-100 p-3 rounded-lg border border-base-300 text-xs space-y-2">
          <div class="flex justify-between">
            <span class="text-base-content/60">主机信息:</span>
            <span class="font-mono">{{ selectedServer.username }}@{{ selectedServer.host }}:{{ selectedServer.port }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">认证方式:</span>
            <span>{{ selectedServer.auth_type === 'password' ? '密码认证' : 'SSH 私钥认证' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">预设路径:</span>
            <span class="font-mono text-primary">{{ selectedServer.remote_path }}</span>
          </div>
        </div>

        <!-- Custom Remote Path Override -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">远程目标完整文件路径 (可临时修改)</span>
          </label>
          <input
            v-model="customRemotePath"
            type="text"
            placeholder="/usr/local/etc/xray/config.json"
            class="input input-sm input-bordered bg-base-100 font-mono text-xs"
          />
        </div>

        <!-- Execute Post Command Checkbox -->
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3 py-1">
            <input
              v-model="executePostCommand"
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
            />
            <span class="label-text text-xs">
              拷贝完成后自动执行重启/生效命令:
              <span class="font-mono text-primary font-semibold ml-1">
                {{ selectedServer?.post_command || '无预设命令' }}
              </span>
            </span>
          </label>
        </div>

        <!-- Push Output Log / Result -->
        <div v-if="pushResult" class="mt-4 p-3 rounded-lg text-xs" :class="pushResult.success ? 'bg-success/15 border border-success/30' : 'bg-error/15 border border-error/30'">
          <div class="font-bold flex items-center gap-1" :class="pushResult.success ? 'text-success' : 'text-error'">
            <span>{{ pushResult.success ? '✓ 推送成功！' : '✗ 推送失败' }}</span>
          </div>
          <p class="mt-1">{{ pushResult.message }}</p>

          <div v-if="pushResult.postCommandResult" class="mt-2 pt-2 border-t border-base-300">
            <div class="font-mono text-[11px] opacity-75">
              命令执行: {{ pushResult.postCommandResult.command }} (退出码: {{ pushResult.postCommandResult.code }})
            </div>
            <pre v-if="pushResult.postCommandResult.stdout" class="mt-1 p-2 bg-base-300/60 rounded font-mono text-[11px] max-h-32 overflow-auto">{{ pushResult.postCommandResult.stdout }}</pre>
            <pre v-if="pushResult.postCommandResult.stderr" class="mt-1 p-2 bg-error/20 text-error rounded font-mono text-[11px] max-h-32 overflow-auto">{{ pushResult.postCommandResult.stderr }}</pre>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action pt-3 border-t border-base-300 flex justify-between items-center">
          <span class="text-xs text-base-content/60">
            提示：推送将通过 SSH/SFTP 覆盖远程文件，并在维护历史中留痕
          </span>
          <div class="flex gap-2">
            <button type="button" @click="$emit('close')" class="btn btn-sm btn-ghost">关闭</button>
            <button
              type="submit"
              :disabled="loading || !selectedServerId"
              class="btn btn-sm btn-primary gap-1"
            >
              <span v-if="loading" class="loading loading-spinner loading-xs"></span>
              <span>确认远程推送拷贝</span>
            </button>
          </div>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useServersStore } from '../stores/servers.js';
import { pushConfigToServer } from '../api/ssh.js';
import { PushResult } from '../types/index.js';
import { useToastStore } from '../stores/toast.js';

const props = defineProps<{
  open: boolean;
  content: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'pushed'): void;
}>();

const serversStore = useServersStore();
const toast = useToastStore();

const servers = computed(() => serversStore.servers);
const selectedServerId = ref<number | ''>('');
const customRemotePath = ref('');
const executePostCommand = ref(true);
const loading = ref(false);
const pushResult = ref<PushResult | null>(null);

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
      pushResult.value = null;
      if (servers.value.length > 0 && !selectedServerId.value) {
        selectedServerId.value = servers.value[0].id;
        customRemotePath.value = servers.value[0].remote_path;
      }
    }
  }
);

async function handlePush() {
  if (!selectedServerId.value) return;

  loading.value = true;
  pushResult.value = null;

  try {
    const res = await pushConfigToServer({
      server_id: Number(selectedServerId.value),
      content: props.content,
      execute_post_command: executePostCommand.value,
      custom_remote_path: customRemotePath.value || undefined,
    });

    pushResult.value = res;
    if (res.success) {
      toast.success('远程推送拷贝成功！');
      emit('pushed');
    }
  } catch (err: any) {
    pushResult.value = {
      success: false,
      message: err.message || '远程拷贝失败',
    };
    toast.error(`远程推送失败: ${err.message}`);
  } finally {
    loading.value = false;
  }
}
</script>
