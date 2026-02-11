'use client'

import { Button } from 'antd'
import { TranslationOutlined } from '@ant-design/icons'
import { useI18n } from '@/hooks/use-i18n'

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  return (
    <Button
      type="default"
      size="middle"
      onClick={toggleLanguage}
      icon={<TranslationOutlined />}
    >
      {language === 'zh' ? '中文' : 'English'}
    </Button>
  )
}
