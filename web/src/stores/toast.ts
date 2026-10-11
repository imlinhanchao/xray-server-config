import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastMessage[]>([]);

  function show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3500) {
    const id = Math.random().toString(36).substring(2, 9);
    toasts.value.push({ id, type, message, duration });

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function success(msg: string, duration?: number) {
    show(msg, 'success', duration);
  }

  function error(msg: string, duration = 5000) {
    show(msg, 'error', duration);
  }

  function info(msg: string, duration?: number) {
    show(msg, 'info', duration);
  }

  function warning(msg: string, duration?: number) {
    show(msg, 'warning', duration);
  }

  return {
    toasts,
    show,
    remove,
    success,
    error,
    info,
    warning,
  };
});
