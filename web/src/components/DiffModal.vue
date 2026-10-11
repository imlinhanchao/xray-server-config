<template>
  <dialog class="modal" :class="{ 'modal-open': open }">
    <div class="modal-box w-11/12 max-w-6xl max-h-[90vh] flex flex-col p-4 bg-base-200">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-base-300 pb-3 gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="badge badge-primary badge-sm shrink-0">Diff 对比</span>
          <h3 class="font-bold text-sm sm:text-base truncate">{{ title }}</h3>
        </div>

        <!-- Close Button -->
        <button @click="$emit('close')" class="btn btn-sm btn-circle btn-ghost shrink-0">✕</button>
      </div>

      <!-- Diff Labels Banner -->
      <div class="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs py-1.5 px-3 bg-base-300/60 rounded mt-3">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="badge badge-error badge-xs shrink-0"></span>
          <span class="font-semibold text-error shrink-0">旧版:</span>
          <span class="opacity-80 truncate">{{ oldLabel || '原始版本' }}</span>
        </div>
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="badge badge-success badge-xs shrink-0"></span>
          <span class="font-semibold text-success shrink-0">新版:</span>
          <span class="opacity-80 truncate">{{ newLabel || '变更版本' }}</span>
        </div>
      </div>

      <!-- Diff Container with adaptive background -->
      <div
        class="flex-1 overflow-auto my-3 rounded-lg border border-base-300 shadow-inner p-1 transition-colors duration-200"
        :class="effectiveTheme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'"
      >
        <CodeDiff
          :old-string="oldString || ''"
          :new-string="newString || ''"
          :output-format="outputFormat"
          diff-style="word"
          language="json"
          :theme="effectiveTheme"
          :filename="oldLabel || 'Old'"
          :new-filename="newLabel || 'New'"
          :hide-header="false"
        />
      </div>

      <!-- Modal Footer -->
      <div class="modal-action mt-2 pt-2 border-t border-base-300 flex justify-between items-center">
        <div class="text-xs text-base-content/60">
          提示：绿色为新增内容，红色为删除/修改前内容
        </div>
        <div class="flex gap-2">
          <slot name="actions"></slot>
          <button @click="$emit('close')" class="btn btn-sm btn-ghost">关闭</button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CodeDiff } from 'v-code-diff';
import { useThemeStore } from '../stores/theme.js';

const props = defineProps<{
  open: boolean;
  title?: string;
  oldString: string;
  newString: string;
  oldLabel?: string;
  newLabel?: string;
  theme?: 'dark' | 'light';
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const themeStore = useThemeStore();

// Follow theme store directly
const effectiveTheme = computed<'dark' | 'light'>(() => {
  return props.theme || themeStore.diffTheme;
});

// Responsive output format: mobile line-by-line, pc side-by-side
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
function handleResize() {
  windowWidth.value = window.innerWidth;
}
const outputFormat = computed<'side-by-side' | 'line-by-line'>(() => {
  return windowWidth.value < 768 ? 'line-by-line' : 'side-by-side';
});

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>
