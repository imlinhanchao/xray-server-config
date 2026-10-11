<template>
  <dialog class="modal" :class="{ 'modal-open': open }">
    <div class="modal-box w-11/12 max-w-2xl bg-base-200 p-6">
      <div class="flex items-center justify-between border-b border-base-300 pb-3 mb-4">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <span>{{ isEdit ? '编辑目标服务器' : '添加目标服务器' }}</span>
        </h3>
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost">✕</button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name & Host Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">服务器别名 <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="例如：HK-Prod-01"
              required
              class="input input-sm input-bordered bg-base-100"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">主机地址 (IP / 域名) <span class="text-error">*</span></span>
            </label>
            <input
              v-model="form.host"
              type="text"
              placeholder="例如：192.168.1.100 或 vps.example.com"
              required
              class="input input-sm input-bordered bg-base-100"
            />
          </div>
        </div>

        <!-- Port & Username Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">SSH 端口</span>
            </label>
            <input
              v-model.number="form.port"
              type="number"
              placeholder="默认 22"
              class="input input-sm input-bordered bg-base-100"
            />
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">SSH 登录用户名</span>
            </label>
            <input
              v-model="form.username"
              type="text"
              placeholder="默认 root"
              class="input input-sm input-bordered bg-base-100"
            />
          </div>
        </div>

        <!-- Auth Type Selection Tabs -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">认证方式</span>
          </label>
          <div class="tabs tabs-boxed bg-base-300 p-1">
            <a
              class="tab tab-sm flex-1"
              :class="{ 'tab-active font-semibold': form.auth_type === 'password' }"
              @click="form.auth_type = 'password'"
            >
              密码认证 (Password)
            </a>
            <a
              class="tab tab-sm flex-1"
              :class="{ 'tab-active font-semibold': form.auth_type === 'privateKey' }"
              @click="form.auth_type = 'privateKey'"
            >
              SSH 密钥认证 (Private Key)
            </a>
          </div>
        </div>

        <!-- Password Field -->
        <div v-if="form.auth_type === 'password'" class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">SSH 密码</span>
            <span v-if="isEdit && server?.has_password" class="label-text-alt text-warning text-xs">
              若无需更改密码，请留空或保持原样
            </span>
          </label>
          <input
            v-model="form.password"
            type="password"
            :placeholder="isEdit && server?.has_password ? '留空保持原有密码' : '输入 SSH 密码'"
            class="input input-sm input-bordered bg-base-100"
          />
        </div>

        <!-- Private Key Fields -->
        <div v-else class="space-y-3">
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">SSH 私钥 (PEM / OpenSSH 格式)</span>
              <span v-if="isEdit && server?.has_private_key" class="label-text-alt text-warning text-xs">
                若无需更改私钥，请留空
              </span>
            </label>
            <textarea
              v-model="form.private_key"
              rows="4"
              :placeholder="isEdit && server?.has_private_key ? '留空保持原有私钥' : '-----BEGIN OPENSSH PRIVATE KEY-----\n...'"
              class="textarea textarea-bordered textarea-sm font-mono text-xs bg-base-100"
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium text-xs">私钥密码短语 (Passphrase，可选)</span>
            </label>
            <input
              v-model="form.passphrase"
              type="password"
              placeholder="若私钥未加密可留空"
              class="input input-sm input-bordered bg-base-100"
            />
          </div>
        </div>

        <!-- Remote Path & Post Command -->
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">远程拷贝目标文件路径 <span class="text-error">*</span></span>
          </label>
          <input
            v-model="form.remote_path"
            type="text"
            required
            placeholder="/usr/local/etc/xray/config.json"
            class="input input-sm input-bordered bg-base-100 font-mono text-xs"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">拷贝后执行命令 (如重启服务，留空则不执行)</span>
          </label>
          <input
            v-model="form.post_command"
            type="text"
            placeholder="systemctl restart xray"
            class="input input-sm input-bordered bg-base-100 font-mono text-xs"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">备注说明</span>
          </label>
          <input
            v-model="form.description"
            type="text"
            placeholder="例如：香港节点主代理服务"
            class="input input-sm input-bordered bg-base-100"
          />
        </div>

        <!-- Test Connection Feedback Message -->
        <div v-if="testResult" class="p-3 rounded-lg text-xs" :class="testResult.success ? 'bg-success/20 text-success border border-success/30' : 'bg-error/20 text-error border border-error/30'">
          <div class="font-bold mb-1 flex items-center gap-1">
            <span>{{ testResult.success ? '✓ 连接测试成功' : '✗ 连接测试失败' }}</span>
          </div>
          <p>{{ testResult.message }}</p>
          <p v-if="testResult.systemInfo" class="opacity-80 font-mono text-[11px] mt-1">{{ testResult.systemInfo }}</p>
        </div>

        <!-- Form Actions -->
        <div class="modal-action pt-3 border-t border-base-300 flex justify-between items-center">
          <button
            type="button"
            @click="handleTest"
            :disabled="testing || !form.host"
            class="btn btn-sm btn-outline btn-info gap-1"
          >
            <span v-if="testing" class="loading loading-spinner loading-xs"></span>
            <span>测试连接</span>
          </button>

          <div class="flex gap-2">
            <button type="button" @click="$emit('close')" class="btn btn-sm btn-ghost">取消</button>
            <button type="submit" :disabled="submitting" class="btn btn-sm btn-primary">
              <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
              <span>保存</span>
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
import { ref, watch, computed } from 'vue';
import { Server, SshTestResult } from '../types/index.js';
import { useServersStore } from '../stores/servers.js';

const props = defineProps<{
  open: boolean;
  server?: Server | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const serversStore = useServersStore();

const isEdit = computed(() => Boolean(props.server?.id));
const testing = ref(false);
const submitting = ref(false);
const testResult = ref<SshTestResult | null>(null);

const form = ref<{
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'privateKey';
  password: string;
  private_key: string;
  passphrase: string;
  remote_path: string;
  post_command: string;
  description: string;
}>({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  auth_type: 'password',
  password: '',
  private_key: '',
  passphrase: '',
  remote_path: '/usr/local/etc/xray/config.json',
  post_command: 'systemctl restart xray',
  description: '',
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      testResult.value = null;
      if (props.server) {
        form.value = {
          name: props.server.name || '',
          host: props.server.host || '',
          port: props.server.port || 22,
          username: props.server.username || 'root',
          auth_type: props.server.auth_type || 'password',
          password: '',
          private_key: '',
          passphrase: props.server.passphrase || '',
          remote_path: props.server.remote_path || '/usr/local/etc/xray/config.json',
          post_command: props.server.post_command || 'systemctl restart xray',
          description: props.server.description || '',
        };
      } else {
        form.value = {
          name: '',
          host: '',
          port: 22,
          username: 'root',
          auth_type: 'password',
          password: '',
          private_key: '',
          passphrase: '',
          remote_path: '/usr/local/etc/xray/config.json',
          post_command: 'systemctl restart xray',
          description: '',
        };
      }
    }
  }
);

async function handleTest() {
  testing.value = true;
  testResult.value = null;
  try {
    if (isEdit.value && props.server?.id && !form.value.password && !form.value.private_key) {
      // Test existing server with saved credentials
      testResult.value = await serversStore.test(props.server.id);
    } else {
      // Test with current form credentials
      testResult.value = await serversStore.testTemp(form.value);
    }
  } finally {
    testing.value = false;
  }
}

async function handleSubmit() {
  submitting.value = true;
  try {
    let success = false;
    if (isEdit.value && props.server?.id) {
      success = await serversStore.update(props.server.id, form.value);
    } else {
      success = await serversStore.create(form.value);
    }
    if (success) {
      emit('saved');
      emit('close');
    }
  } finally {
    submitting.value = false;
  }
}
</script>
