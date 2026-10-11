import { api } from './client.js';
import { HistoryItem } from '../types/index.js';

export function fetchHistory(limit = 100, offset = 0) {
  return api.get<{ success: boolean; history: HistoryItem[] }>(`/history?limit=${limit}&offset=${offset}`);
}

export function fetchHistoryById(id: number) {
  return api.get<{ success: boolean; history: HistoryItem }>(`/history/${id}`);
}

export function compareHistoryVersions(v1: number, v2: number) {
  return api.get<{
    success: boolean;
    v1: { version: number; title: string; created_at: string; content: string };
    v2: { version: number; title: string; created_at: string; content: string };
  }>(`/history/compare/${v1}/${v2}`);
}

export function rollbackHistory(id: number) {
  return api.post<{ success: boolean; message: string; history: HistoryItem }>(`/history/${id}/rollback`);
}
