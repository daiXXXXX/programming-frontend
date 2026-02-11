# Programming Frontend - Next.js

基于 Next.js 14 构建的编程实验平台前端项目。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + Less + CSS Modules
- **UI组件**: Radix UI + shadcn/ui
- **状态管理**: React Query
- **动画**: Framer Motion
- **图表**: ECharts / Recharts
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
│   ├── providers.tsx    # 全局 Providers
│   └── globals.css      # 全局样式
├── components/          # React 组件
│   ├── ui/              # UI 基础组件 (shadcn/ui)
│   └── *.tsx            # 业务组件
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具库
│   ├── api.ts           # API 客户端
│   ├── i18n.ts          # 国际化配置
│   ├── types.ts         # 类型定义
│   └── utils.ts         # 工具函数
├── styles/              # 样式文件
│   └── variables.less   # Less 变量和混合
└── types/               # TypeScript 类型声明
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

```less
// Component.module.less
@import "../styles/variables.less";

.container {
  padding: @spacing-lg;
  .shadow-md();
}
```

### CSS 变量

主题色彩通过 CSS 变量定义，支持暗色模式：

```css
:root {
  --primary: oklch(0.45 0.15 250);
  --background: oklch(0.99 0.005 260);
  /* ... */
}

.dark {
  --primary: oklch(0.55 0.15 250);
  --background: oklch(0.15 0.02 260);
  /* ... */
}
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

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
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
