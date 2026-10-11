import { api } from './client.js';
import { PushResult, PullResult } from '../types/index.js';

export function pushConfigToServer(payload: {
  server_id: number;
  content?: string;
  execute_post_command?: boolean;
  custom_remote_path?: string;
}) {
  return api.post<PushResult>('/ssh/push', payload);
}

export function pullConfigFromServer(payload: {
  server_id: number;
  custom_remote_path?: string;
  save_to_local?: boolean;
  title?: string;
  description?: string;
}) {
  return api.post<PullResult>('/ssh/pull', payload);
}
