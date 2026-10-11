<template>
  <div class="relative w-full h-full flex flex-col bg-base-100 rounded-lg overflow-hidden border border-base-300">
    <!-- CodeMirror Editor Component -->
    <div class="flex-1 overflow-auto">
      <Codemirror
        v-model="internalValue"
        placeholder="请输入或粘贴 JSON 配置..."
        :style="{ height: '100%', minHeight: '480px' }"
        :autofocus="true"
        :indent-with-tab="true"
        :tab-size="2"
        :extensions="extensions"
        @change="handleChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { useThemeStore } from '../stores/theme.js';

const props = defineProps<{
  modelValue: string;
  theme?: 'dark' | 'light';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const themeStore = useThemeStore();
const internalValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== internalValue.value) {
      internalValue.value = val;
    }
  }
);

const effectiveTheme = computed(() => {
  return props.theme || themeStore.diffTheme;
});

const extensions = computed<any[]>(() => {
  const exts: any[] = [json()];
  // Dark theme styling for CodeMirror
  if (effectiveTheme.value === 'dark') {
    exts.push(oneDark);
  }
  return exts;
});

function handleChange(val: string) {
  emit('update:modelValue', val);
  emit('change', val);
}
</script>

<style>
/* Ensure CodeMirror occupies full container height */
.cm-editor {
  height: 100% !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 13.5px !important;
  line-height: 1.5 !important;
}
.cm-scroller {
  overflow: auto !important;
}
</style>
