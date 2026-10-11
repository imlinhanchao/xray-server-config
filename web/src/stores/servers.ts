import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  fetchServers,
  createServer as apiCreateServer,
  updateServer as apiUpdateServer,
  deleteServer as apiDeleteServer,
  testServerConnection,
  testTempServerConnection,
} from '../api/servers.js';
import { Server, SshTestResult } from '../types/index.js';
import { useToastStore } from './toast.js';

export const useServersStore = defineStore('servers', () => {
  const servers = ref<Server[]>([]);
  const loading = ref(false);
  const toast = useToastStore();

  async function loadServers() {
    loading.value = true;
    try {
      const res = await fetchServers();
      servers.value = res.servers;
    } catch (err: any) {
      toast.error(`获取服务器列表失败: ${err.message}`);
    } finally {
      loading.value = false;
    }
  }

  async function create(serverData: Partial<Server>): Promise<boolean> {
    try {
      const res = await apiCreateServer(serverData);
      servers.value.unshift(res.server);
      toast.success(`服务器 [${res.server.name}] 添加成功`);
      return true;
    } catch (err: any) {
      toast.error(`添加服务器失败: ${err.message}`);
      return false;
    }
  }

  async function update(id: number, serverData: Partial<Server>): Promise<boolean> {
    try {
      const res = await apiUpdateServer(id, serverData);
      const index = servers.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        servers.value[index] = res.server;
      }
      toast.success(`服务器 [${res.server.name}] 更新成功`);
      return true;
    } catch (err: any) {
      toast.error(`更新服务器失败: ${err.message}`);
      return false;
    }
  }

  async function remove(id: number): Promise<boolean> {
    try {
      await apiDeleteServer(id);
      servers.value = servers.value.filter((s) => s.id !== id);
      toast.success('服务器已删除');
      return true;
    } catch (err: any) {
      toast.error(`删除服务器失败: ${err.message}`);
      return false;
    }
  }

  async function test(id: number): Promise<SshTestResult> {
    try {
      const res = await testServerConnection(id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      return res;
    } catch (err: any) {
      const res: SshTestResult = { success: false, message: err.message };
      toast.error(`连接测试失败: ${err.message}`);
      return res;
    }
  }

  async function testTemp(data: Partial<Server>): Promise<SshTestResult> {
    try {
      const res = await testTempServerConnection(data);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      return res;
    } catch (err: any) {
      const res: SshTestResult = { success: false, message: err.message };
      toast.error(`连接测试失败: ${err.message}`);
      return res;
    }
  }

  return {
    servers,
    loading,
    loadServers,
    create,
    update,
    remove,
    test,
    testTemp,
  };
});
