// Ant Design 主题配置
import type { ThemeConfig } from 'antd'

export const antdTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#4f46e5', // Indigo
    colorSuccess: '#22c55e', // Green
    colorWarning: '#f59e0b', // Amber
    colorError: '#ef4444', // Red
    colorInfo: '#3b82f6', // Blue
    
    // 字体
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFamilyCode: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    
    // 阴影
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#f9fafb',
    },
    Tabs: {
      itemSelectedColor: '#4f46e5',
      inkBarColor: '#4f46e5',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Message: {
      borderRadiusLG: 8,
    },
  },
}

// 暗色主题配置
export const antdDarkTheme: ThemeConfig = {
  ...antdTheme,
  token: {
    ...antdTheme.token,
    colorBgContainer: '#1f2937',
    colorBgElevated: '#374151',
    colorBgLayout: '#111827',
    colorText: '#f9fafb',
    colorTextSecondary: '#9ca3af',
    colorBorder: '#374151',
  },
}
