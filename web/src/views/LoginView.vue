<template>
  <div class="card w-full max-w-md bg-base-100 shadow-2xl border border-base-300">
    <div class="card-body">
      <!-- Title & Branding -->
      <div class="text-center mb-4">
        <div class="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 class="card-title justify-center text-xl font-bold">Xray 配置管理平台</h2>
        <p class="text-xs text-base-content/60 mt-1">内置固定账号安全登录</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4 mt-2">
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">用户名</span>
          </label>
          <input
            v-model="username"
            type="text"
            required
            placeholder="请输入管理员用户名"
            class="input input-sm input-bordered bg-base-200"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-xs">密码</span>
          </label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="请输入登录密码"
            class="input input-sm input-bordered bg-base-200"
          />
        </div>

        <div class="form-control mt-6">
          <button
            type="submit"
            :disabled="authStore.loading"
            class="btn btn-sm btn-primary w-full gap-2"
          >
            <span v-if="authStore.loading" class="loading loading-spinner loading-xs"></span>
            <span>登录系统</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');

async function handleLogin() {
  const success = await authStore.login(username.value, password.value);
  if (success) {
    router.push('/editor');
  }
}
</script>
