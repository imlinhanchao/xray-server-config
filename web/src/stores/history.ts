import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchHistory,
  fetchHistoryById,
  rollbackHistory as apiRollbackHistory,
  compareHistoryVersions as apiCompareHistoryVersions,
} from '../api/history.js';
import { HistoryItem } from '../types/index.js';
import { useToastStore } from './toast.js';

export const useHistoryStore = defineStore('history', () => {
  const historyList = ref<HistoryItem[]>([]);
  const currentDetail = ref<HistoryItem | null>(null);
  const loading = ref(false);
  const toast = useToastStore();

  async function loadHistory(limit = 100, offset = 0) {
    loading.value = true;
    try {
      const res = await fetchHistory(limit, offset);
      historyList.value = res.history;
    } catch (err: any) {
      toast.error(`获取维护历史失败: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }

  async function loadDetail(id: number): Promise<HistoryItem | null> {
    try {
      const res = await fetchHistoryById(id);
      currentDetail.value = res.history;
      return res.history;
    } catch (err: any) {
      toast.error(`获取版本详情失败: ${err.message}`);
      return null;
    }
  }

  async function rollback(id: number): Promise<boolean> {
    try {
      const res = await apiRollbackHistory(id);
      toast.success(res.message || '回滚成功！');
      await loadHistory();
      return true;
    } catch (err: any) {
      toast.error(`回滚失败: ${err.message}`);
      return false;
    }
  }

  async function compare(v1: number, v2: number) {
    try {
      return await apiCompareHistoryVersions(v1, v2);
    } catch (err: any) {
      toast.error(`版本对比失败: ${err.message}`);
      throw err;
    }
  }

  return {
    historyList,
    currentDetail,
    loading,
    loadHistory,
    loadDetail,
    rollback,
    compare,
  };
});
