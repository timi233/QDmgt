# 待解决问题（代码巡检 2026-01-18）

1. **敏感凭据泄漏**  
   - `backend/.env` 与 `.env.native` 已提交真实数据库/Redis/JWT/飞书密钥。需立即轮换全部泄漏的密钥、更新配置，并确保仓库中不再包含真实凭据。

2. **备份接口权限过宽**  
   - `backend/src/routes/backupRoutes.ts` 仅要求 leader 角色即可执行备份创建/恢复/删除。应限制为 admin 且增强确认/审计，防止误操作或恶意恢复/删除数据库。

3. **构建不校验类型错误**  
   - `backend/package.json` 构建脚本使用 `tsc --noEmitOnError false || true`，会吞掉类型错误，CI 无法阻止类型回归。应改为正常失败模式（如 `tsc --noEmitOnError`）。

4. **前端默认 API 地址缺少版本前缀**  
   - `frontend/src/services/authService.ts` 默认 `API_BASE_URL` 为 `http://localhost:4000/api`，缺少 `/api/v1`。在未配置 `VITE_API_BASE_URL` 时会请求不存在的接口，导致认证等功能不可用。需将默认值改为包含 `/api/v1` 或强制依赖环境变量。
