# Frontend - 前端应用

基于 React 18 + Vite + TypeScript 的现代前端应用。

## 技术栈

- **框架**: React 18.2 + TypeScript 5.3
- **构建工具**: Vite 5.x
- **UI 组件库**: Ant Design 5.12
- **状态管理**: Zustand 4.4
- **数据获取**: TanStack React Query 5.14
- **路由**: React Router 6.20
- **样式**: Tailwind CSS 3.4
- **HTTP 客户端**: Axios 1.6
- **数据验证**: Zod 3.22

## 目录结构

```
src/
├── components/     # 通用组件
├── pages/          # 页面组件
├── hooks/          # 自定义 Hooks
├── stores/         # Zustand stores
├── services/       # API 服务层
├── utils/          # 工具函数
├── types/          # TypeScript 类型定义
└── assets/         # 静态资源
```

## 开发

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 环境变量

创建 `.env.local` 文件:

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## 代码规范

- 使用 ESLint + Prettier
- 遵循 Airbnb React 风格指南
- 组件使用函数式组件 + Hooks
- 优先使用 TypeScript 类型推导
