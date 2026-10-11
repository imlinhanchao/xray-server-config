<template>
  <component :is="layoutComponent">
    <router-view />
  </component>
  <Toast />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from './layouts/AppLayout.vue';
import AuthLayout from './layouts/AuthLayout.vue';
import Toast from './components/Toast.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  return route.meta?.layout === 'AuthLayout' ? AuthLayout : AppLayout;
});
</script>
