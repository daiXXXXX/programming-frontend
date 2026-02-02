import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'
import { Translate } from '@phosphor-icons/react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
    >
      <Translate size={18} />
      {language === 'zh' ? '中文' : 'English'}
    </Button>
  )
}
