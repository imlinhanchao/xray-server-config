import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type AppTheme = 'dark' | 'light' | 'corporate' | 'night';

export const useThemeStore = defineStore('theme', () => {
  const initialTheme = (localStorage.getItem('xray_app_theme') as AppTheme) || 'dark';
  const currentTheme = ref<AppTheme>(initialTheme);

  const isDark = computed(() => {
    return currentTheme.value === 'dark' || currentTheme.value === 'night';
  });

  const diffTheme = computed<'dark' | 'light'>(() => {
    return isDark.value ? 'dark' : 'light';
  });

  function setTheme(theme: AppTheme) {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('xray_app_theme', theme);
  }

  function initTheme() {
    const saved = (localStorage.getItem('xray_app_theme') as AppTheme) || 'dark';
    setTheme(saved);
  }

  return {
    currentTheme,
    isDark,
    diffTheme,
    setTheme,
    initTheme,
  };
});
