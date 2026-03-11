'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Badge } from 'antd'
import { 
  House,
  Code,
  Trophy,
  User,
} from '@phosphor-icons/react'
import { useI18n, useAuth } from '@/hooks'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface MobileLayoutProps {
  children: ReactNode
  showTabBar?: boolean
  headerTitle?: string
  headerLeft?: ReactNode
  headerRight?: ReactNode
  showHeader?: boolean
}

const TAB_ITEMS = [
  { key: '/home-mobile', icon: House, label: 'home' },
  { key: '/workspace-mobile', icon: Code, label: 'workspace' },
  { key: '/ranking-mobile', icon: Trophy, label: 'ranking' },
  { key: '/profile-mobile', icon: User, label: 'profile' },
]

export function MobileLayout({ 
  children, 
  showTabBar = true,
  headerTitle,
  headerLeft,
  headerRight,
  showHeader = true,
}: MobileLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useI18n()
  const { isAuthenticated } = useAuth()

  const getTabLabel = (key: string) => {
    switch (key) {
      case '/home-mobile': return t('mobile.tab.home') || '首页'
      case '/workspace-mobile': return t('mobile.tab.workspace') || '刷题'
      case '/ranking-mobile': return t('mobile.tab.ranking') || '排行'
      case '/profile-mobile': return t('mobile.tab.profile') || '我的'
      default: return ''
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f5f5f5',
      maxWidth: '100vw',
      overflow: 'hidden',
    }}>
      {/* Header */}
      {showHeader && (
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}>
          <div style={{ flex: '0 0 auto' }}>
            {headerLeft}
          </div>
          {headerTitle && (
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              fontWeight: 600, 
              fontSize: 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 8px',
            }}>
              {headerTitle}
            </div>
          )}
          <div style={{ flex: '0 0 auto' }}>
            {headerRight || <LanguageSwitcher />}
          </div>
        </header>
      )}

      {/* Content */}
      <main style={{ 
        flex: 1, 
        overflow: 'auto',
        paddingBottom: showTabBar ? 60 : 0,
        WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </main>

      {/* Tab Bar */}
      {showTabBar && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 56,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {TAB_ITEMS.map(item => {
            const isActive = pathname === item.key
            const Icon = item.icon
            return (
              <div
                key={item.key}
                onClick={() => {
                  if (item.key === '/profile-mobile' && !isAuthenticated) {
                    router.push('/login-mobile')
                    return
                  }
                  router.push(item.key)
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  padding: '6px 16px',
                  transition: 'all 0.2s',
                  color: isActive ? '#4f46e5' : '#999',
                }}
              >
                <Icon 
                  size={22} 
                  weight={isActive ? 'fill' : 'regular'} 
                />
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {getTabLabel(item.key)}
                </span>
              </div>
            )
          })}
        </nav>
      )}
    </div>
  )
}
