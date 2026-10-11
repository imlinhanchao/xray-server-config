import { api } from './client.js';
import { ConfigResponse, HistoryItem } from '../types/index.js';

export function fetchConfig() {
  return api.get<ConfigResponse>('/config');
}

export function validateConfig(content: string) {
  return api.post<{ valid: boolean; error?: string; formatted?: string }>('/config/validate', { content });
}

export function validateDomain(domain: string) {
  return api.post<{ valid: boolean; error?: string; normalized?: string }>('/config/validate-domain', { domain });
}

export function validateDomainsList(domains: string[]) {
  return api.post<{ valid: boolean; results: Array<{ raw: string; valid: boolean; error?: string; normalized?: string }> }>(
    '/config/validate-domain',
    { domains }
  );
}

export function saveConfig(data: {
  domains?: string[];
  content?: string;
  title?: string;
  description?: string;
}) {
  return api.post<{
    success: boolean;
    message: string;
    domains?: string[];
    content?: string;
    history: HistoryItem;
  }>('/config/save', data);
}
