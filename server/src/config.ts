import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is two levels up from server/src
export const ROOT_DIR = path.resolve(__dirname, '../../');
export const SERVER_DIR = path.resolve(__dirname, '../');

// Load environment variables from cwd and from project root
dotenv.config();
dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

export const CONFIG = {
  PORT: Number(process.env.PORT) || 8080,
  HOST: process.env.HOST || '0.0.0.0',
  APP_USERNAME: process.env.APP_USERNAME || 'admin',
  APP_PASSWORD: process.env.APP_PASSWORD || 'admin123456',
  JWT_SECRET: process.env.JWT_SECRET || 'xray-cfg-secret-jwt-key-2026',
  CONFIG_FILE_PATH: process.env.CONFIG_FILE_PATH
    ? path.resolve(ROOT_DIR, process.env.CONFIG_FILE_PATH)
    : path.resolve(ROOT_DIR, 'config.json'),
  DB_PATH: process.env.DB_PATH
    ? path.resolve(ROOT_DIR, process.env.DB_PATH)
    : path.resolve(ROOT_DIR, 'xray_cfg.db'),
};
