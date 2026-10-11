import { NodeSSH } from 'node-ssh';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ServerRow } from '../db/index.js';

export interface SshTestResult {
  success: boolean;
  message: string;
  systemInfo?: string;
  remotePathExists?: boolean;
}

export interface SshPushResult {
  success: boolean;
  message: string;
  postCommandResult?: {
    command: string;
    stdout: string;
    stderr: string;
    code: number | null;
  };
}

export interface SshPullResult {
  success: boolean;
  content: string;
  message: string;
}

function getSshConfig(server: Pick<ServerRow, 'host' | 'port' | 'username' | 'auth_type' | 'password' | 'private_key' | 'passphrase'>) {
  const config: any = {
    host: server.host,
    port: server.port || 22,
    username: server.username || 'root',
    readyTimeout: 15000,
  };

  if (server.auth_type === 'password') {
    if (!server.password) {
      throw new Error('Password authentication selected but password is empty');
    }
    config.password = server.password;
  } else {
    if (!server.private_key) {
      throw new Error('Private key authentication selected but private key is empty');
    }
    config.privateKey = server.private_key;
    if (server.passphrase) {
      config.passphrase = server.passphrase;
    }
  }

  return config;
}

export async function testSshConnection(server: Pick<ServerRow, 'host' | 'port' | 'username' | 'auth_type' | 'password' | 'private_key' | 'passphrase' | 'remote_path'>): Promise<SshTestResult> {
  const ssh = new NodeSSH();
  try {
    const config = getSshConfig(server);
    await ssh.connect(config);

    const unameRes = await ssh.execCommand('uname -a');
    let remotePathExists = false;
    if (server.remote_path) {
      const checkRes = await ssh.execCommand(`test -f "${server.remote_path}" && echo "EXISTS" || echo "NOT_FOUND"`);
      remotePathExists = checkRes.stdout.trim() === 'EXISTS';
    }

    return {
      success: true,
      message: 'SSH connection established successfully!',
      systemInfo: unameRes.stdout.trim(),
      remotePathExists,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'SSH connection failed',
    };
  } finally {
    ssh.dispose();
  }
}

export async function pushConfigToRemote(
  server: ServerRow,
  content: string,
  executePostCommand = true
): Promise<SshPushResult> {
  const ssh = new NodeSSH();
  const tempFileName = `xray_cfg_${crypto.randomBytes(8).toString('hex')}.json`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    fs.writeFileSync(tempFilePath, content, 'utf-8');

    const config = getSshConfig(server);
    await ssh.connect(config);

    // Ensure remote directory exists
    const remoteDir = path.posix.dirname(server.remote_path);
    await ssh.execCommand(`mkdir -p "${remoteDir}"`);

    // Upload file
    await ssh.putFile(tempFilePath, server.remote_path);

    let postCommandResult;
    if (executePostCommand && server.post_command && server.post_command.trim().length > 0) {
      const execRes = await ssh.execCommand(server.post_command);
      postCommandResult = {
        command: server.post_command,
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        code: execRes.code,
      };
    }

    return {
      success: true,
      message: `Config successfully copied to ${server.host}:${server.remote_path}`,
      postCommandResult,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to push config: ${err.message}`,
    };
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
    ssh.dispose();
  }
}

export async function pullConfigFromRemote(server: ServerRow): Promise<SshPullResult> {
  const ssh = new NodeSSH();
  const tempFileName = `xray_pull_${crypto.randomBytes(8).toString('hex')}.json`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    const config = getSshConfig(server);
    await ssh.connect(config);

    // Try downloading with SFTP first
    try {
      await ssh.getFile(tempFilePath, server.remote_path);
      const content = fs.readFileSync(tempFilePath, 'utf-8');
      return {
        success: true,
        content,
        message: `Successfully pulled config from ${server.host}:${server.remote_path}`,
      };
    } catch (sftpErr) {
      // Fallback: try reading file using cat command if SFTP fails
      const catRes = await ssh.execCommand(`cat "${server.remote_path}"`);
      if (catRes.code !== 0 || !catRes.stdout) {
        throw new Error(catRes.stderr || `File not found or unreadable at ${server.remote_path}`);
      }
      return {
        success: true,
        content: catRes.stdout,
        message: `Successfully read config via remote command from ${server.host}:${server.remote_path}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      content: '',
      message: `Failed to pull remote config: ${err.message}`,
    };
  } finally {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
    ssh.dispose();
  }
}
