import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      layout: 'AuthLayout',
      requiresAuth: false,
      title: '登录 - Xray Config Manager',
    },
  },
  {
    path: '/',
    redirect: '/editor',
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('../views/EditorView.vue'),
    meta: {
      layout: 'AppLayout',
      requiresAuth: true,
      title: '配置维护 - Xray Config Manager',
    },
  },
  {
    path: '/servers',
    name: 'Servers',
    component: () => import('../views/ServersView.vue'),
    meta: {
      layout: 'AppLayout',
      requiresAuth: true,
      title: '服务器管理 - Xray Config Manager',
    },
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
    meta: {
      layout: 'AppLayout',
      requiresAuth: true,
      title: '维护历史 - Xray Config Manager',
    },
  },
  {
    path: '/diff',
    name: 'Diff',
    component: () => import('../views/DiffView.vue'),
    meta: {
      layout: 'AppLayout',
      requiresAuth: true,
      title: '版本对比 - Xray Config Manager',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/editor',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('xray_auth_token');

  // Update document title
  if (to.meta?.title) {
    document.title = to.meta.title as string;
  }

  if (to.meta?.requiresAuth && !token) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && token) {
    next({ name: 'Editor' });
  } else {
    next();
  }
});

export default router;
