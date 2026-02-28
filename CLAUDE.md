## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + Less + CSS Modules
- **UI组件**: Ant Design 5.x + @ant-design/icons
- **状态管理**: Zustand (持久化) + 自定义 Hooks + Context
- **动画**: Framer Motion
- **图表**: ECharts
- **国际化**: 自定义 i18n 方案

## 具体实现要求

- **样式文件要求**：用less文件写样式，并且样式尽量嵌套，以方便复用和阅读
- 国际化要分两个文件写（中文和英文），国际化的所有key value都是string，所以没必要定义类型。并且要用useTranslation导出一个实例来实现国际化，形如{t('common.login')}。
