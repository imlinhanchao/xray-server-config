# Xray Config Manager (Web 配置运维管理平台)

专用于维护与远程部署 `config.json` 的现代化 Web 运维应用。

## 🌟 核心特性

- 🔒 **固定登录认证**：内置管理员账号安全认证（默认账号 `admin` / 密码 `admin123456`，可通过环境变量自定义），JWT 凭据保护所有 API。
- 🔄 **双模式自由切换**：
  - **域名规则维护模式 (Domain List)**：
    - 针对 `config.json` 中的 `routing.rules.domain` 字段进行可视化维护；
    - 强制规范：字符串数组，固定以 `domain:` 打头，后缀为有效域名（如 `domain:openai.com`）；
    - 支持单条添加（自动补全 `domain:` 前缀）、批量导入、A-Z 排序、一键去重、实时搜索、单行编辑/删除。
  - **全量配置编辑模式 (Full Config)**：
    - 一键切换至全量 `config.json` 智能代码编辑器（基于 CodeMirror，支持 JSON 高亮、折叠、缩进美化、行号、实时语法错误检测）；
    - 模式切换时自动**双向智能同步**（在域名列表修改后切至全量可立即预览生效，在全量修改后切回域名列表自动重新提取）。
- 🖥️ **目标服务器多机管理**：
  - 目标主机信息持久化存储在 SQLite 中，支持增删改查。
  - 支持 **密码认证** 与 **SSH-Key 私钥认证**（支持带有 Passphrase 的密钥）。
  - 支持免保存快速一键 **测试连接**。
- 🚀 **SSH 远程推送与拷贝**：
  - 维护后一键将本地或指定版本配置通过 SFTP 拷贝到目标服务器的指定目录（如 `/usr/local/etc/xray/config.json`）。
  - 支持拷贝完成后自动执行指定生效命令（例如 `systemctl restart xray`），并实时回显执行状态与控制台日志。
- 📥 **远程配置拉取 (Pull)**：
  - 支持从远端服务器拉取最新运行配置。
  - 拉取后自动调用 `v-code-diff` 与本地配置进行差异对比，用户可选择覆盖本地并生成历史，或仅载入编辑器草稿。
- 📜 **完整维护历史记入**：
  - SQLite 数据库完整记录每次维护日志（版本号、操作类型：编辑/推送/拉取/回滚、操作人、标题说明、全量配置快照）。
  - 支持一键回滚历史快照到本地 `config.json`。
- 🔍 **专业版本 Diff 对比**：
  - 深度集成 **`v-code-diff`** 库。
  - 支持在弹窗或专用 Diff 视图中对任意两个历史版本、或当前未保存草稿与历史版本进行并排对比（Side-by-side）或逐行对比（Line-by-line）。
- 🎨 **极强可维护性架构**：
  - 前端采用 **Vue 3 + Tailwind CSS + DaisyUI + Pinia + Vue Router**，严格区分 `layouts`（`AppLayout` / `AuthLayout`）、`router`、`views`、`components`、`stores` 与 `api`。
  - 后端采用 **Hono + better-sqlite3 + node-ssh**，结构清晰，分层明确（`db`、`routes`、`services`、`middleware`）。

---

## 🛠️ 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Tailwind CSS + DaisyUI + `v-code-diff` + `vue-codemirror` + Pinia + Vue Router
- **后端**：Hono + `@hono/node-server` + TypeScript
- **数据库**：SQLite (`better-sqlite3`, WAL 模式)
- **远程连接**：`node-ssh` / `ssh2`

---

## 📁 目录结构

```text
xray-cfg/
├── config.json                 # 目标维护的主配置文件
├── xray_cfg.db                 # SQLite 数据库（自动生成与迁移）
├── package.json                # 根工作区脚本管理
├── pnpm-workspace.yaml
├── server/                     # Hono 后端服务
│   ├── src/
│   │   ├── config.ts           # 配置与环境变量解析
│   │   ├── index.ts            # 服务主入口（API 路由挂载与 SPA 静态托管）
│   │   ├── db/                 # SQLite 数据库模型与 CRUD
│   │   ├── middleware/         # JWT 鉴权中间件
│   │   ├── routes/             # auth, config, servers, history, ssh 路由
│   │   └── services/           # SSH 连接、SFTP 传输、文件读写与备份服务
│   ├── tsconfig.json
│   └── package.json
└── web/                        # Vue 3 前端工程
    ├── src/
    │   ├── layouts/            # AppLayout.vue, AuthLayout.vue
    │   ├── router/             # index.ts（包含导航守卫与元信息）
    │   ├── views/              # EditorView, ServersView, HistoryView, DiffView, LoginView
    │   ├── components/         # CodeEditor, DiffModal, ServerModal, PushModal, PullModal, Toast
    │   ├── stores/             # auth, config, servers, history, toast
    │   ├── api/                # client, auth, config, servers, history, ssh
    │   └── types/              # TypeScript 接口定义
    ├── tailwind.config.js      # Tailwind + DaisyUI 主题配置
    ├── vite.config.ts          # Vite 构建与开发代理配置
    └── package.json
```

---

## 🚀 启动与运行

### 1. 安装依赖与配置环境
```bash
# 复制示例环境变量文件
cp .env.example .env

# 安装依赖
pnpm install
```

### 2. 开发模式 (前端与后端热重载并行)
```bash
# 并行启动前端(5173端口)与后端(8080端口)
pnpm dev

# 或分别启动：
pnpm dev:server
pnpm dev:web
```
开发时访问：`http://localhost:5173`

### 3. 生产模式 (单端口一键托管)
```bash
# 构建前端与后端
pnpm build

# 启动服务
pnpm start
```
生产模式直接访问：`http://localhost:8080`

---

## 🔑 默认登录凭据与环境配置

- **默认用户名**：`admin`
- **默认密码**：`admin123456`

环境变量配置项详见项目根目录下的 **[`.env.example`](file:///Users/hancel/Documents/project/xray-cfg/.env.example)**：
- `PORT`：后端监听端口（默认 `8080`）
- `APP_USERNAME` / `APP_PASSWORD`：管理员固定登录账密
- `JWT_SECRET`：JWT 鉴权密钥
- `CONFIG_FILE_PATH`：维护的目标文件路径（默认 `config.json`）
- `DB_PATH`：SQLite 数据文件路径（默认 `xray_cfg.db`）
