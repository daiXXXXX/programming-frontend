'use client'

import { Button, Typography, Card } from 'antd'
import { 
  Code, 
  Rocket,
  BookOpen,
  ChartLineUp,
  Clock,
  Lightning,
  ArrowRight,
} from '@phosphor-icons/react'
import { LoginOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n, useAuth } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { MobileLayout } from '@/components/MobileLayout'

const { Title, Text, Paragraph } = Typography

function getGreetingKey(): 'morning' | 'forenoon' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 12) return 'forenoon'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

function getTimeGradient(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
  if (hour >= 9 && hour < 12) return 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
  if (hour >= 12 && hour < 18) return 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)'
  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

export default function MobileHomePage() {
  const { t } = useI18n()
  const { user, isAuthenticated } = useAuth()
  useMobileRedirect()

  const greetingKey = getGreetingKey()
  const greeting = t(`home.greeting.${greetingKey}`)
  const userName = user?.username || t('home.guest')

  const features = [
    {
      icon: <Code size={28} weight="duotone" className="text-indigo-500" />,
      title: t('home.features.practice.title'),
      description: t('home.features.practice.description'),
    },
    {
      icon: <Lightning size={28} weight="duotone" className="text-amber-500" />,
      title: t('home.features.realtime.title'),
      description: t('home.features.realtime.description'),
    },
    {
      icon: <ChartLineUp size={28} weight="duotone" className="text-emerald-500" />,
      title: t('home.features.progress.title'),
      description: t('home.features.progress.description'),
    },
  ]

  return (
    <MobileLayout 
      showHeader={false}
      showTabBar={true}
    >
      {/* Hero Banner */}
      <div style={{
        background: getTimeGradient(),
        padding: '32px 20px 40px',
        borderRadius: '0 0 24px 24px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Code size={28} weight="duotone" style={{ color: '#4f46e5' }} />
            <Text strong style={{ fontSize: 16 }}>{t('header.title')}</Text>
          </div>

          {/* Greeting */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 20,
            padding: '6px 14px',
            marginBottom: 16,
          }}>
            <Clock size={16} style={{ color: '#4f46e5' }} />
            <Text style={{ fontSize: 13 }}>{greeting}，{userName}！</Text>
          </div>

          <Title level={3} style={{ margin: '0 0 8px', color: '#1a1a2e' }}>
            {t('home.welcome')}
          </Title>
          <Paragraph style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>
            {t('home.subtitle')}
          </Paragraph>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {isAuthenticated ? (
              <Link href="/workspace-mobile">
                <Button
                  type="primary"
                  size="large"
                  icon={<Rocket size={18} />}
                  style={{ borderRadius: 20, height: 44, paddingInline: 24 }}
                >
                  {t('home.startCoding')}
                  <ArrowRight size={16} style={{ marginLeft: 4 }} />
                </Button>
              </Link>
            ) : (
              <Link href="/login-mobile">
                <Button
                  type="primary"
                  size="large"
                  icon={<LoginOutlined />}
                  style={{ borderRadius: 20, height: 44, paddingInline: 24 }}
                >
                  {t('common.login')}
                </Button>
              </Link>
            )}
            <Link href="/workspace-mobile">
              <Button
                size="large"
                icon={<BookOpen size={18} />}
                style={{ borderRadius: 20, height: 44, paddingInline: 20 }}
              >
                {t('home.viewProblems')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div style={{ padding: '20px 16px' }}>
        <Title level={5} style={{ marginBottom: 12, paddingLeft: 4 }}>
          平台特色
        </Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                style={{ borderRadius: 12 }}
                styles={{ body: { padding: 16 } }}
                bordered
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#f5f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {feature.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                      {feature.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {feature.description}
                    </Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 16px 24px' }}>
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>50+</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('home.stats.problems')}</Text>
            </div>
            <div style={{ width: 1, background: '#f0f0f0' }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>1000+</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('home.stats.submissions')}</Text>
            </div>
            <div style={{ width: 1, background: '#f0f0f0' }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>100+</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('home.stats.users')}</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '8px 16px 20px' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          &copy; {new Date().getFullYear()} {t('header.title')}
        </Text>
      </div>
    </MobileLayout>
  )
}
