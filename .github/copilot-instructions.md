# Programming Frontend - Copilot Instructions

## 项目概述

这是一个在线编程练习平台的前端项目，支持题目浏览、代码提交评测、排行榜、个人统计等功能。

## 技术栈

- **框架**: Next.js 14 (App Router, `'use client'` 客户端组件为主)
- **语言**: TypeScript (strict 模式)
- **UI 组件库**: Ant Design 5.x
- **样式**: Tailwind CSS (布局/间距) + Less (复杂样式, CSS Modules 隔离) + CSS 变量 (oklch 色彩空间, 明暗主题)
- **状态管理**: Zustand 4 + `persist` 中间件 + localStorage
- **动画**: Framer Motion 12
- **图表**: ECharts 6 + Recharts 2
- **代码编辑器**: Monaco Editor (@monaco-editor/react)
- **图标**: @phosphor-icons/react (主) + @ant-design/icons (辅)
- **国际化**: 自定义 i18n 方案 (src/lib/i18n/)
- **验证**: Zod
- **日期**: date-fns 3
- **字体**: Space Grotesk (正文) + JetBrains Mono (代码)

## 路径别名

- `@/*` → `./src/*`
- 导入时始终使用 `@/` 别名，如 `import { api } from '@/lib/api'`

## 文件组织规范

```
src/
├── app/           # Next.js App Router 页面
├── components/    # 可复用组件
├── hooks/         # 自定义 Hooks（统一从 @/hooks 导出）
├── lib/           # 工具库、API、类型定义
│   ├── api.ts     # ApiClient 类（通用 API）
│   ├── auth-api.ts # 认证相关 API
│   ├── types.ts   # 通用类型
│   └── i18n/      # 国际化翻译文件
├── store/         # Zustand Store
│   ├── appStore.ts   # 应用数据状态
│   └── authStore.ts  # 认证状态
└── styles/        # Less 变量
```

## 组件编写规范

- 使用**命名导出**: `export function ComponentName() {}`，不用 `export default`
- 客户端组件添加 `'use client'` 指令
- Props 使用 `interface` 定义，放在组件前面
- 组件内使用 `useI18n` 或 `useTranslation` 获取翻译函数

```tsx
"use client";
import { useTranslation } from "@/hooks";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const { t } = useTranslation();
  return <div>{t("common.title")}</div>;
}
```

## 样式规范

- **布局和间距**: 使用 Tailwind 工具类 (`flex items-center gap-4`, `space-y-3`)
- **复杂/可复用样式**: 写在 `.module.less` 文件中，样式尽量嵌套
- **主题颜色**: 使用 CSS 变量 (`var(--primary)`, `var(--background)`)，通过 Tailwind 语义色 (`bg-primary`, `text-foreground`)
- **Ant Design 主题**: 通过 `src/lib/antd-theme.ts` 统一配置
- 不要使用内联 style，除非是动态计算值

## 状态管理规范

- **Zustand Store**: 使用 `persist` 中间件持久化到 localStorage
- **选择器 Hooks**: 每个 store 导出细粒度选择器，如 `useProblems()`, `useUser()`
- **缓存策略**: 数据缓存 5 分钟 (`isCacheValid`)
- **认证状态**: 统一从 `useAuthStore` 读取，token 自动附加到请求
- 业务 Hooks 放 `src/hooks/`，统一通过 `@/hooks` barrel export 导出

## API 调用规范

- **通用 API**: 使用 `src/lib/api.ts` 的 `api` 单例 (ApiClient 类)
- **认证 API**: 使用 `src/lib/auth-api.ts` 的 `authApi` 对象
- API 基础路径通过 Next.js rewrites 代理到后端 `localhost:8080`
- Token 自动从 `auth-storage` (localStorage) 读取并附加 Authorization 头
- 错误响应统一处理，认证失败自动尝试刷新 token

## 国际化规范

- 翻译文件: `src/lib/i18n/zh.ts` 和 `src/lib/i18n/en.ts`
- 使用**扁平 key-value** 格式 (`Record<string, string>`)，点号分隔层级
- 消费方式: `const { t } = useTranslation()`，然后 `{t('section.key')}`
- **不需要为翻译定义 TypeScript 类型**
- 新增文案时，中英文文件都要同步更新

```typescript
// src/lib/i18n/zh.ts
const zh: Record<string, string> = {
  "profile.title": "个人信息",
  "common.save": "保存",
};
```

## 后端 API 对接

- 后端地址: `http://localhost:8080`，前端 `http://localhost:3001`
- 代理配置在 `next.config.js` 的 `rewrites` 中
- 认证: Bearer Token (JWT)，Access Token + Refresh Token 机制
- 用户角色: `student` | `instructor` | `admin`，权限层级递增

## 注意事项

- `gin.Default()` 和自定义 middleware 有重复注册问题（后端），前端不用管
- 类型定义在 `api.ts` 和 `types.ts` 中存在部分重复，新类型优先定义在 `types.ts`
- Ant Design 的 `message` 用于操作反馈提示
- 动画使用 Framer Motion 的 `motion.div` + `variants` 模式
