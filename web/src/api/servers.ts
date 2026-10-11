import { api } from './client.js';
import { Server, SshTestResult } from '../types/index.js';

export function fetchServers() {
  return api.get<{ success: boolean; servers: Server[] }>('/servers');
}

export function fetchServerById(id: number) {
  return api.get<{ success: boolean; server: Server }>(`/servers/${id}`);
}

export function createServer(data: Partial<Server>) {
  return api.post<{ success: boolean; message: string; server: Server }>('/servers', data);
}

export function updateServer(id: number, data: Partial<Server>) {
  return api.put<{ success: boolean; message: string; server: Server }>(`/servers/${id}`, data);
}

export function deleteServer(id: number) {
  return api.delete<{ success: boolean; message: string }>(`/servers/${id}`);
}

export function testServerConnection(id: number) {
  return api.post<SshTestResult>(`/servers/${id}/test`);
}

export function testTempServerConnection(data: Partial<Server>) {
  return api.post<SshTestResult>('/servers/test-temp', data);
}
