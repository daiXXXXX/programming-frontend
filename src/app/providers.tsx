'use client'

import { ReactNode, useState, useEffect } from 'react'
import { ConfigProvider, App as AntdApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { I18nProvider } from '@/components/I18nProvider'
import { antdTheme } from '@/lib/antd-theme'
import { useI18n } from '@/hooks/use-i18n'

// Ant Design 配置包装器
function AntdConfigProvider({ children }: { children: ReactNode }) {
  const { language } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 防止 SSR 水合不匹配
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ConfigProvider
      locale={language === 'zh' ? zhCN : enUS}
      theme={{
        ...antdTheme,
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <AntdApp>
        {children}
      </AntdApp>
    </ConfigProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AntdConfigProvider>
        {children}
      </AntdConfigProvider>
    </I18nProvider>
  )
}
