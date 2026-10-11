<template>
  <div class="drawer lg:drawer-open min-h-screen bg-base-300">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />

    <!-- Drawer Content (Main Page Body) -->
    <div class="drawer-content flex flex-col min-h-screen">
      <!-- Top Navbar -->
      <header class="navbar bg-base-100 border-b border-base-300 px-4 h-14 sticky top-0 z-30 shadow-sm">
        <div class="flex-none lg:hidden">
          <label for="main-drawer" class="btn btn-square btn-ghost btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </label>
        </div>

        <!-- Left Navbar Info: Current Route and File info -->
        <div class="flex-1 flex items-center gap-2 min-w-0">
          <div class="text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0">
            <span class="badge badge-neutral badge-sm font-mono truncate max-w-[130px] sm:max-w-[260px]">
              {{ configStore.editMode === 'domains' ? 'rules.domain' : 'config.json' }}
            </span>
          </div>

          <!-- Dirty / Saved status: compact dot on mobile, full text on desktop -->
          <div
            v-if="configStore.isDirty"
            class="badge badge-warning badge-sm gap-1 animate-pulse text-[11px] shrink-0"
            title="存在未保存变更"
          >
            <span>●</span>
            <span class="hidden sm:inline">未保存</span>
          </div>
          <div
            v-else
            class="badge badge-ghost badge-sm text-success gap-1 text-[11px] shrink-0 hidden sm:inline-flex"
          >
            ✓ 已保存
          </div>

          <!-- Total count: desktop only -->
          <div v-if="configStore.editMode === 'domains' && configStore.domains.length" class="text-xs text-base-content/60 hidden md:inline shrink-0">
            共 <span class="font-bold text-primary">{{ configStore.domains.length }}</span> 个域名
          </div>
        </div>

        <!-- Right Navbar Tools: Theme Switcher & User Profile -->
        <div class="flex-none flex items-center gap-1 sm:gap-2">
          <!-- Theme selector -->
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-xs gap-1 px-1.5 sm:px-2">
              <span class="hidden sm:inline">主题 ({{ themeLabel(themeStore.currentTheme) }})</span>
              <span class="sm:hidden text-xs">{{ themeStore.isDark ? '🌙' : '☀️' }}</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-36 text-xs">
              <li>
                <a :class="{ 'active font-bold': themeStore.currentTheme === 'dark' }" @click="themeStore.setTheme('dark')">
                  Dark (深色)
                </a>
              </li>
              <li>
                <a :class="{ 'active font-bold': themeStore.currentTheme === 'night' }" @click="themeStore.setTheme('night')">
                  Night (暗夜)
                </a>
              </li>
              <li>
                <a :class="{ 'active font-bold': themeStore.currentTheme === 'light' }" @click="themeStore.setTheme('light')">
                  Light (浅色)
                </a>
              </li>
              <li>
                <a :class="{ 'active font-bold': themeStore.currentTheme === 'corporate' }" @click="themeStore.setTheme('corporate')">
                  Corporate (商务)
                </a>
              </li>
            </ul>
          </div>

          <!-- User Profile & Logout -->
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-2">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-7">
                  <span class="text-xs font-bold">{{ authStore.user?.username?.charAt(0).toUpperCase() || 'A' }}</span>
                </div>
              </div>
              <span class="text-xs font-medium hidden sm:inline">{{ authStore.user?.username || 'admin' }}</span>
            </div>
            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-200 rounded-box w-44 text-xs">
              <li class="menu-title text-base-content/60">当前用户: {{ authStore.user?.username }}</li>
              <li>
                <a @click="handleLogout" class="text-error">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  退出登录
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Main Content Slot -->
      <main class="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
        <slot />
      </main>
    </div>

    <!-- Sidebar Drawer -->
    <div class="drawer-side z-40">
      <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <aside class="w-64 min-h-screen bg-base-100 border-r border-base-300 flex flex-col justify-between">
        <div>
          <!-- App Logo & Title -->
          <div class="p-4 border-b border-base-300 flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-xl text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 class="font-bold text-sm leading-tight tracking-wide">Xray Config</h1>
              <p class="text-[11px] text-base-content/60">远程运维与配置管理平台</p>
            </div>
          </div>

          <!-- Navigation Menu -->
          <ul class="menu p-3 space-y-1 text-sm font-medium">
            <li>
              <router-link
                to="/editor"
                class="flex items-center gap-3 py-2.5 rounded-lg"
                :class="{ 'active font-bold': $route.path === '/editor' || $route.path === '/' }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>域名规则维护</span>
              </router-link>
            </li>

            <li>
              <router-link
                to="/servers"
                class="flex items-center gap-3 py-2.5 rounded-lg"
                :class="{ 'active font-bold': $route.path === '/servers' }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span>目标服务器管理</span>
              </router-link>
            </li>

            <li>
              <router-link
                to="/history"
                class="flex items-center gap-3 py-2.5 rounded-lg"
                :class="{ 'active font-bold': $route.path === '/history' }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>维护历史记录</span>
              </router-link>
            </li>

            <li>
              <router-link
                to="/diff"
                class="flex items-center gap-3 py-2.5 rounded-lg"
                :class="{ 'active font-bold': $route.path === '/diff' }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>版本 Diff 对比</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-base-300 text-[11px] text-base-content/50 space-y-1">
          <div class="flex items-center justify-between">
            <span>技术栈</span>
            <span class="badge badge-xs">Vue3 + Hono + SQLite</span>
          </div>
          <div class="text-[10px] text-base-content/40">
            支持密码/SSH-Key远程部署
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useConfigStore } from '../stores/config.js';

import { useThemeStore, AppTheme } from '../stores/theme.js';

const authStore = useAuthStore();
const configStore = useConfigStore();
const themeStore = useThemeStore();
const router = useRouter();

function themeLabel(theme: AppTheme) {
  const map: Record<AppTheme, string> = {
    dark: '深色',
    night: '暗夜',
    light: '浅色',
    corporate: '商务',
  };
  return map[theme] || theme;
}

onMounted(() => {
  themeStore.initTheme();
  configStore.load();
});

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
