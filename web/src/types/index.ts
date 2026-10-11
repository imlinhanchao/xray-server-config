export interface User {
  username: string;
  role: string;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'privateKey';
  password?: string | null;
  private_key?: string | null;
  passphrase?: string | null;
  has_password?: boolean;
  has_private_key?: boolean;
  remote_path: string;
  post_command?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoryItem {
  id: number;
  version: number;
  title: string;
  description?: string | null;
  content?: string;
  contentLength?: number;
  operator: string;
  action_type: 'edit' | 'pull' | 'rollback' | 'push' | 'initial';
  server_id?: number | null;
  server_name?: string | null;
  created_at: string;
}

export interface ConfigResponse {
  success: boolean;
  domains: string[];
  content: string;
  formatted: string;
  isValidJson: boolean;
  jsonError?: string;
  latestHistory?: HistoryItem | null;
  configPath: string;
}

export interface PostCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface PushResult {
  success: boolean;
  message: string;
  postCommandResult?: PostCommandResult;
  history?: HistoryItem;
}

export interface PullResult {
  success: boolean;
  message: string;
  content: string;
  formatted?: string;
  isValidJson: boolean;
  jsonError?: string;
  server?: {
    id: number;
    name: string;
    host: string;
    remote_path: string;
  };
  history?: HistoryItem | null;
}

export interface SshTestResult {
  success: boolean;
  message: string;
  systemInfo?: string;
  remotePathExists?: boolean;
}
