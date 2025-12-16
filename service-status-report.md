# 服务启动说明（2025-11-28）

## 服务状态
- **后端**：`backend` 使用 `npm run dev` 运行，PowerShell 进程 PID `26636`（Node PID `29908`）监听 `0.0.0.0:4000`；健康检查 `http://localhost:4000/health` 返回 `{"status":"ok","timestamp":"2025-11-28T09:46:14.936Z","uptime":57.8431683}`，日志写入 `backend-dev.log`。停止命令：`Stop-Process -Id (Get-Content backend.pid) -Force`。
- **前端**：`frontend` 使用 `npm run dev` 运行，PowerShell 进程 PID `20300`（Node PID `38048`）监听 `http://localhost:3001`（因 3000 被占改口）；`Invoke-WebRequest http://localhost:3001` 返回 Vite Dev HTML（含 `react-refresh` 脚本），日志写入 `frontend-dev.log`。停止命令：`Stop-Process -Id (Get-Content frontend.pid) -Force`。
- **依赖**：Node v24.11.1 / npm 11.6.2 已验证，`frontend`/`backend` 的 `node_modules` 均存在，无需额外安装。
- **异常提示**：后端日志多次输出 `[Redis] Disabled due to connection error`，说明未连接本地 Redis，缓存/调度功能暂时降级。

## 多方案与执行链路
1. **方案A（已实施）**：分别在前后端目录运行 `npm run dev`，获得最快的热重载体验；缺点是 Redis/数据库需手动额外启动。  
2. **方案B（候选）**：根目录执行 `npm run dev` 或 `docker-compose up -d`，一次拉起前后端+PostgreSQL+Redis，便于全量验证但资源开销更大、调试稍慢。

### 主链回顾（8 步）
1. 解读代理指令与需求、确认需拉起前后端。  
2. 枚举 `D:\` 定位 `渠道` 目录。  
3. 浏览项目根目录，识别前/后端结构与关键文档。  
4. 阅读 `README.md` 与 `docs/`，并全局搜索 “Context7” 确认无额外要求。  
5. 验证 Node/npm 版本及 `node_modules` 状态。  
6. 使用 `Start-Process` 后台运行 `backend`，日志重定向到 `backend-dev.log`。  
7. 同法运行 `frontend`，记录 `frontend.pid` 并确认端口。  
8. 借助 `netstat` 与 `Invoke-WebRequest` 交叉验证 4000/3001 的可访问性并整理输出。

### 分支链路（端口监听异常排查）
1. 初次后台运行后端时发现 4000 未监听；  
2. 检查 `backend-dev.log` 与 `netstat`，确认进程已退出；  
3. 重新启动并显式设置 `NODE_ENV=development`，更新 `backend.pid`；  
4. 再次以 `netstat`+健康检查确认监听恢复，再并回主链。

## 苏格拉底式质询与置信度
- **结论A：后端 4000 正常**  
  - 对手A：若只是僵尸进程？→ `netstat` 显示 `0.0.0.0:4000 LISTENING (PID 29908)` 且实时健康检查 200。置信度 0.82（中），尚未做长时间观察。  
  - 对手B：健康检查或许是旧缓存？→ 响应时间戳 `2025-11-28T09:46:14.936Z` 与日志刷新吻合。置信度 0.96（高）。
- **结论B：前端 3001 正常**  
  - 对手A：端口可能由其他 Node 服务占用？→ `frontend.pid` 关联 Node PID `38048`，`netstat` 将 3001 监听归属该 PID。置信度 0.80（中）。  
  - 对手B：返回页面也许是缓存文件？→ `Invoke-WebRequest http://localhost:3001` 返回包含 `react-refresh` 的 dev HTML，响应头 `Date: Fri, 28 Nov 2025 09:46:26 GMT`。置信度 0.95（高）。

## 交叉验证与证据
- `netstat -ano | Select-String ":4000"`、`Invoke-WebRequest http://localhost:4000/health` 共同证明后端监听与处理请求正常。  
- `netstat -ano | Select-String "3001"`、`Invoke-WebRequest http://localhost:3001` 验证前端 Vite Dev Server 运行。  
- `node -v`、`npm -v`、`Test-Path frontend/node_modules`、`Test-Path backend/node_modules` 证明依赖环境满足要求。  
- `README.md` 与 `docs/README.md` 的检查确保没有遗漏 Context7 等特殊指令。

## 残余不确定性
- **Redis 未运行**：导致缓存/调度关闭；若业务依赖需启动 Redis（可通过 `docker-compose`）并重启后端验证。  
- **PostgreSQL 数据未确认**：尚未知数据库容器/服务是否运行及迁移状态，可能影响高阶功能。  
- **远程访问**：当前仅保证本机 `localhost` 访问正常，如需外网访问需做端口映射或在 `.env.development` 调整 `VITE_API_BASE_URL` 与 `CORS_ORIGIN`。

## 后续建议
1. 需要完整链路时运行 `npm run docker:up` 启动 Postgres/Redis，再重启服务确认缓存逻辑。  
2. 用浏览器访问 `http://localhost:3001`（或所需映射地址）体验 UI，如在远程机器操作请做端口映射。  
3. 调试完成后执行 `Stop-Process` 终止后台 PowerShell，并清理 `backend-dev.log`、`frontend-dev.log` 与 PID 文件，保持目录整洁。
