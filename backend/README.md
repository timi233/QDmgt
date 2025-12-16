# Backend - 后端 API

基于 Express + TypeScript + Prisma 的 RESTful API 服务。

## 技术栈

- **框架**: Express 4.18 + TypeScript 5.3
- **ORM**: Prisma 5.7
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **认证**: JWT (jsonwebtoken 9.0)
- **密码加密**: bcrypt 5.1
- **数据验证**: Zod 3.22
- **日志**: Winston 3.11
- **安全**: Helmet 7.1 + CORS + Rate Limiting

## 目录结构

```
src/
├── routes/         # API 路由定义
├── controllers/    # 控制器层
├── services/       # 业务逻辑层
├── middlewares/    # 中间件
├── utils/          # 工具函数
├── config/         # 配置文件
├── types/          # TypeScript 类型
├── app.ts          # Express 应用配置
└── server.ts       # HTTP 服务器入口
```

## 开发

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate dev

# 开发服务器 (热重载)
npm run dev

# 构建
npm run build

# 生产启动
npm start
```

## 数据库

```bash
# 创建迁移
npx prisma migrate dev --name <migration-name>

# 重置数据库
npx prisma migrate reset

# 打开 Prisma Studio
npx prisma studio

# 种子数据
npm run db:seed
```

## 环境变量

参见根目录 `.env.example` 文件。

## API 文档

启动服务后访问: http://localhost:4000/api/docs

## 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```
