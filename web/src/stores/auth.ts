import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as apiLogin, getCurrentUser } from '../api/auth.js';
import { User } from '../types/index.js';
import { useToastStore } from './toast.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('xray_auth_token'));
  const user = ref<User | null>(null);
  const loading = ref(false);
  const toast = useToastStore();

  const isAuthenticated = computed(() => Boolean(token.value));

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true;
    try {
      const res = await apiLogin({ username, password });
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem('xray_auth_token', res.token);
      toast.success(`欢迎回来，${res.user.username}`);
      return true;
    } catch (err: any) {
      toast.error(err.message || '登录失败，请检查账号密码');
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('xray_auth_token');
    toast.info('已安全退出登录');
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) return false;
    try {
      const res = await getCurrentUser();
      user.value = res.user;
      return true;
    } catch {
      logout();
      return false;
    }
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  };
});
