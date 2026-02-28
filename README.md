# Programming Frontend - Next.js

基于 Next.js 14 构建的编程实验平台前端项目。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + Less + CSS Modules
- **UI组件**: Ant Design 5.x + @ant-design/icons
- **状态管理**: Zustand (持久化) + 自定义 Hooks + Context
- **动画**: Framer Motion
- **图表**: ECharts
- **国际化**: 自定义 i18n 方案

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

项目将在 http://localhost:5000 启动。

### 构建生产版本

```bash
npm run build
npm run start
```

## 项目结构

```
src/
├── app/                 # Next.js App Router 页面
│   ├── layout.tsx       # 根布局
│   ├── page.tsx         # 首页
│   ├── providers.tsx    # 全局 Providers (Ant Design ConfigProvider)
│   └── globals.css      # 全局样式
├── components/          # React 组件
│   └── *.tsx            # 业务组件 (使用 Ant Design)
├── hooks/               # 自定义 Hooks
│   ├── use-problems.ts  # 问题数据管理
│   ├── use-submissions.ts # 提交管理
│   ├── use-ui-state.ts  # UI 状态管理
│   ├── use-i18n.ts      # 国际化
│   └── index.ts         # 统一导出
├── store/               # 状态管理
│   └── appStore.ts      # Zustand 全局状态 (带持久化)
├── lib/                 # 工具库
│   ├── api.ts           # API 客户端
│   ├── antd-theme.ts    # Ant Design 主题配置
│   ├── i18n.ts          # 国际化配置
│   ├── types.ts         # 类型定义
│   └── utils.ts         # 工具函数
└── styles/              # 样式文件
    └── theme.css        # 主题变量
```

## 状态管理

### Zustand 全局缓存

使用 Zustand 实现带持久化的全局状态管理：

```tsx
// store/appStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set, get) => ({
      problems: [],
      submissions: [],
      // ...
    }),
    { name: "app-storage" },
  ),
);
```

### 自定义 Hooks

业务逻辑封装在自定义 Hooks 中：

```tsx
import { useProblems, useSubmissions, useUIState } from "@/hooks";

export function MyComponent() {
  const { problems, loading, refresh } = useProblems();
  const { submitCode, getProblemSubmissions } = useSubmissions();
  const { selectProblem, getSelectedProblem } = useUIState();
  // ...
}
```

## 样式系统

### Tailwind CSS

项目使用 Tailwind CSS 作为主要样式方案，配合 CSS 变量实现主题定制。

### Less + CSS Modules

对于需要复杂样式逻辑的组件，可以使用 Less + CSS Modules：

```tsx
// 组件中使用
import styles from "./Component.module.less";

export function Component() {
  return <div className={styles.container}>...</div>;
}
```

### Ant Design 主题

通过 ConfigProvider 配置 Ant Design 主题：

```tsx
// lib/antd-theme.ts
export const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
  },
}

// app/providers.tsx
<ConfigProvider theme={antdTheme}>
  {children}
</ConfigProvider>
```

## API 代理

开发模式下，所有 `/api/*` 请求会被代理到后端服务器：

```
Frontend (localhost:5000) → /api/* → Backend (localhost:8080/api/*)
```

配置在 `next.config.js` 中：

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8080/api/:path*',
    },
  ]
}
```

## 环境变量

创建 `.env.local` 文件：

```env
# API 基础 URL（可选，默认使用代理）
NEXT_PUBLIC_API_BASE_URL=/api
```

## 开发指南

### 添加新页面

在 `src/app/` 目录下创建新文件夹和 `page.tsx`：

```tsx
// src/app/problems/[id]/page.tsx
export default function ProblemPage({ params }: { params: { id: string } }) {
  return <div>Problem {params.id}</div>;
}
```

### 添加客户端组件

使用 React Hooks 的组件需要添加 `'use client'` 指令：

```tsx
"use client";

import { useState } from "react";
import { Button } from "antd";

export function Counter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}
```

### 国际化

使用 `useI18n` hook：

```tsx
import { useI18n } from "@/hooks/use-i18n";

export function MyComponent() {
  const { t, language, setLanguage } = useI18n();
  return <h1>{t.header.title}</h1>;
}
```

## License

MIT
