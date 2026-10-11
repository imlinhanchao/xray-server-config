<template>
  <div class="toast toast-top toast-end z-50">
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      class="alert shadow-lg transition-all duration-300 flex items-center gap-2 max-w-md"
      :class="{
        'alert-success': toast.type === 'success',
        'alert-error': toast.type === 'error',
        'alert-warning': toast.type === 'warning',
        'alert-info': toast.type === 'info',
      }"
    >
      <span class="text-sm flex-1 break-words">{{ toast.message }}</span>
      <button
        @click="toastStore.remove(toast.id)"
        class="btn btn-ghost btn-xs btn-circle"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast.js';

const toastStore = useToastStore();
</script>
