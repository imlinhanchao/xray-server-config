import { api } from './client.js';
import { User } from '../types/index.js';

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export function login(credentials: { username: string; password: string }) {
  return api.post<LoginResponse>('/auth/login', credentials);
}

export function getCurrentUser() {
  return api.get<{ success: boolean; user: User }>('/auth/me');
}
