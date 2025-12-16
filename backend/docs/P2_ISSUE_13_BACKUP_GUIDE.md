# 问题 #13 修复：数据库备份和恢复机制

## 修复概述

实现了完整的数据库备份和恢复系统，包括手动备份、自动备份、备份验证、恢复功能等。

## 实现内容

### 1. 备份服务 (`src/services/backupService.ts`)

#### 核心功能

**创建备份 (`createBackup`)**
- 自动生成带时间戳的备份文件名
- 复制SQLite数据库文件
- 创建备份元数据（JSON）
- 验证备份完整性
- 自动清理旧备份（保留最近30个）

**列出备份 (`listBackups`)**
- 读取所有备份文件及其元数据
- 按创建时间倒序排序
- 显示文件大小、创建时间、描述等信息

**恢复备份 (`restoreBackup`)**
- 恢复前自动创建安全备份
- 断开Prisma连接
- 复制备份文件到数据库路径
- 重新建立Prisma连接

**验证备份 (`verifyBackup`)**
- 检查文件存在性
- 验证文件大小
- 检查SQLite文件头格式
- 返回详细验证结果

**数据库统计 (`getDatabaseStats`)**
- 获取数据库文件大小
- 统计各表记录数
- 返回表数量

**自动备份 (`autoBackup`)**
- 由定时任务调用
- 自动创建标记为"Automatic backup"的备份

### 2. 备份控制器 (`src/controllers/backupController.ts`)

提供HTTP API端点：
- POST `/api/backup/create` - 创建备份
- GET `/api/backup/list` - 列出所有备份
- POST `/api/backup/restore` - 恢复备份（需要确认）
- DELETE `/api/backup/:filename` - 删除备份（需要确认）
- GET `/api/backup/verify/:filename` - 验证备份
- GET `/api/backup/stats` - 获取数据库统计信息

### 3. 备份路由 (`src/routes/backupRoutes.ts`)

- 所有端点需要认证（`authenticateToken`）
- 仅leader角色可访问（`requireRole('leader')`）
- 恢复和删除操作需要确认（`requireConfirmation`）

### 4. 命令行工具 (`src/scripts/backup.ts`)

提供CLI命令：
```bash
npm run backup:create [描述]  # 创建备份
npm run backup:list            # 列出备份
npm run backup:restore <文件名> # 恢复备份
npm run backup:verify <文件名>  # 验证备份
npm run backup:stats           # 数据库统计
```

### 5. 自动备份调度

集成到 `src/utils/scheduler.ts`：
- 每天凌晨3点自动备份
- 使用node-cron调度
- 自动记录日志

### 6. 配置

环境变量（可选）：
```env
BACKUP_DIR=/path/to/backups  # 备份目录，默认: ./backups
MAX_BACKUPS=30               # 保留最近N个备份，默认: 30
```

## 使用示例

### API调用

#### 创建备份
```bash
curl -X POST "http://localhost:4000/api/backup/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"description": "Before major update"}'
```

#### 列出备份
```bash
curl "http://localhost:4000/api/backup/list" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 恢复备份
```bash
curl -X POST "http://localhost:4000/api/backup/restore" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "backupFilename": "backup_2025-12-03_14-30-00.db",
    "confirm": true,
    "createSafetyBackup": true
  }'
```

#### 删除备份
```bash
curl -X DELETE "http://localhost:4000/api/backup/backup_2025-12-03_14-30-00.db?confirm=true" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 验证备份
```bash
curl "http://localhost:4000/api/backup/verify/backup_2025-12-03_14-30-00.db" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 获取数据库统计
```bash
curl "http://localhost:4000/api/backup/stats" \
  -H "Cookie: token=YOUR_TOKEN"
```

### 命令行使用

#### 创建备份
```bash
npm run backup:create "Before migration"
```

#### 列出所有备份
```bash
npm run backup:list
```

输出示例：
```
Found 3 backup(s):

1. backup_2025-12-03_15-30-00.db
   Created: 2025-12-03 15:30:00
   Size: 2.5 MB
   Description: Before major update

2. backup_2025-12-03_14-00-00.db
   Created: 2025-12-03 14:00:00
   Size: 2.4 MB
   Description: Automatic backup

3. backup_2025-12-02_03-00-00.db
   Created: 2025-12-02 03:00:00
   Size: 2.3 MB
   Description: Automatic backup
```

#### 恢复备份
```bash
npm run backup:restore backup_2025-12-03_14-30-00.db
```

#### 验证备份
```bash
npm run backup:verify backup_2025-12-03_14-30-00.db
```

输出示例：
```
Verifying backup: backup_2025-12-03_14-30-00.db

Verification result:
  Valid: ✓ Yes
  Size: 2.5 MB
  Readable: ✓ Yes
```

#### 查看数据库统计
```bash
npm run backup:stats
```

输出示例：
```
Database statistics:

Database size: 2.5 MB
Total tables: 6

Records:
  users: 15
  distributors: 120
  tasks: 450
  events: 2300
  channelTargets: 25
  workPlans: 80
```

## 备份文件结构

### 备份文件
```
backups/
├── backup_2025-12-03_15-30-00.db          # 数据库备份
├── backup_2025-12-03_15-30-00.db.json     # 元数据
├── backup_2025-12-03_14-00-00.db
├── backup_2025-12-03_14-00-00.db.json
└── ...
```

### 元数据格式
```json
{
  "filename": "backup_2025-12-03_15-30-00.db",
  "path": "/path/to/backups/backup_2025-12-03_15-30-00.db",
  "size": 2621440,
  "createdAt": "2025-12-03T15:30:00.000Z",
  "description": "Before major update",
  "databasePath": "/path/to/prisma/dev.db"
}
```

## 自动清理机制

- 每次创建备份后自动清理
- 保留最近N个备份（默认30个）
- 同时删除备份文件和元数据文件
- 记录清理日志

## 安全特性

1. **恢复前安全备份**
   - 默认在恢复前创建当前数据库备份
   - 防止恢复失败导致数据丢失

2. **权限控制**
   - 仅leader角色可以访问备份API
   - 恢复和删除操作需要二次确认

3. **完整性验证**
   - 创建后自动验证备份大小
   - 验证SQLite文件格式
   - 提供独立验证端点

4. **审计日志**
   - 所有备份操作记录到日志
   - 包括成功和失败的操作
   - 记录用户ID和操作时间

## 最佳实践

### 定期备份

推荐备份频率：
- **生产环境**：每天自动备份
- **开发环境**：重大更改前手动备份
- **测试环境**：测试前手动备份

### 备份保留策略

```env
# 根据数据重要性调整
MAX_BACKUPS=30  # 保留30天的每日备份
```

### 恢复测试

定期测试恢复流程：
1. 创建备份
2. 在测试环境恢复
3. 验证数据完整性
4. 测试应用功能

### 异地备份

```bash
# 将备份复制到其他服务器
rsync -avz backups/ user@backup-server:/backups/channel-backend/
```

## 故障恢复流程

### 场景1：数据损坏

```bash
# 1. 停止应用
pm2 stop channel-backend

# 2. 验证最新备份
npm run backup:verify backup_2025-12-03_14-30-00.db

# 3. 恢复备份
npm run backup:restore backup_2025-12-03_14-30-00.db

# 4. 重启应用
pm2 start channel-backend
```

### 场景2：错误操作

```bash
# API恢复（会自动创建安全备份）
curl -X POST "http://localhost:4000/api/backup/restore" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "backupFilename": "backup_2025-12-03_14-30-00.db",
    "confirm": true
  }'
```

## 监控和告警

### 备份成功监控

检查日志文件：
```bash
tail -f logs/combined.log | grep "Backup created successfully"
```

### 备份失败告警

监控错误日志：
```bash
tail -f logs/error.log | grep "Failed to create backup"
```

### 备份空间监控

```bash
# 检查备份目录大小
du -sh backups/

# 检查可用磁盘空间
df -h
```

## 限制和注意事项

1. **SQLite特定**
   - 当前实现仅支持SQLite数据库
   - 其他数据库需要不同的备份策略

2. **文件锁定**
   - 备份期间数据库仍可读写
   - SQLite的WAL模式确保一致性

3. **存储空间**
   - 需要足够空间存储多个备份
   - 建议监控磁盘空间

4. **恢复停机**
   - 恢复过程中应用需要短暂停机
   - 或使用API恢复（会自动处理连接）

## 未来改进

1. **支持其他数据库**
   - PostgreSQL: pg_dump
   - MySQL: mysqldump

2. **增量备份**
   - 减少备份时间和空间
   - 仅备份变更数据

3. **压缩备份**
   - gzip压缩备份文件
   - 节省存储空间

4. **远程备份**
   - 自动上传到云存储（S3, OSS）
   - 异地灾备

5. **备份加密**
   - 加密敏感数据
   - 保护数据隐私

## 总结

问题 #13 已完成：

✅ 实现完整的备份服务
✅ 提供HTTP API和CLI工具
✅ 自动备份调度（每天3AM）
✅ 备份验证和完整性检查
✅ 安全恢复机制
✅ 权限控制和二次确认
✅ 详细文档和使用示例

系统现在具有完善的数据保护能力，可以应对各种数据丢失场景。
