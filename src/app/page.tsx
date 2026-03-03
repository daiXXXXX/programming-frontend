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
import { LoginOutlined, SettingOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n, useAuth } from '@/hooks'
import styles from './home.module.css'

const { Title, Text, Paragraph } = Typography

// 根据当前时间获取问候语类型
function getGreetingKey(): 'morning' | 'forenoon' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 12) return 'forenoon'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

// 根据时间段获取背景样式类名
function getTimeBasedGradientClass(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return styles.gradientMorning
  if (hour >= 9 && hour < 12) return styles.gradientForenoon
  if (hour >= 12 && hour < 18) return styles.gradientAfternoon
  return styles.gradientEvening
}

export default function HomePage() {
  const { t } = useI18n()
  const { user, isAuthenticated } = useAuth()

  const greetingKey = getGreetingKey()
  const greeting = t(`home.greeting.${greetingKey}`)
  const userName = user?.username || t('home.guest')
  const gradientClass = getTimeBasedGradientClass()

  const features = [
    {
      icon: <Code size={32} weight="duotone" className="text-indigo-500" />,
      title: t('home.features.practice.title'),
      description: t('home.features.practice.description'),
    },
    {
      icon: <Lightning size={32} weight="duotone" className="text-amber-500" />,
      title: t('home.features.realtime.title'),
      description: t('home.features.realtime.description'),
    },
    {
      icon: <ChartLineUp size={32} weight="duotone" className="text-emerald-500" />,
      title: t('home.features.progress.title'),
      description: t('home.features.progress.description'),
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div className={`${styles.homePage} ${gradientClass}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Code size={32} weight="duotone" className={styles.logoIcon} />
            <div className={styles.logoText}>
              <Title level={4} className={styles.title}>{t('header.title')}</Title>
              <Text type="secondary" className={styles.subtitle}>{t('header.subtitle')}</Text>
            </div>
          </div>

          <div className={styles.headerActions}>
            <LanguageSwitcher />
            {isAuthenticated && user && (user.role === 'instructor' || user.role === 'admin') && (
              <Link href="/manager">
                <Button type="default" icon={<SettingOutlined />}>
                  {t('header.manager')}
                </Button>
              </Link>
            )}
            {isAuthenticated && user ? (
              <Link href="/workspace">
                <Button type="primary" icon={<Rocket size={16} />}>
                  {t('home.startCoding')}
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button type="primary" icon={<LoginOutlined />}>
                  {t('common.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        className={styles.heroSection}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.heroContent}>
          <motion.div variants={itemVariants}>
            <div className={styles.greetingBadge}>
              <Clock size={18} className={styles.greetingIcon} />
              <span className={styles.greetingText}>
                {greeting}，{userName}！
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Title level={1} className={styles.heroTitle}>
              <span className={styles.gradientText}>
                {t('home.welcome')}
              </span>
            </Title>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Paragraph className={styles.heroSubtitle}>
              {t('home.subtitle')}
            </Paragraph>
          </motion.div>

          <motion.div variants={itemVariants} className={styles.heroActions}>
            <Link href="/workspace">
              <Button 
                type="primary" 
                size="large" 
                icon={<Rocket size={20} />}
                className={styles.primaryBtn}
              >
                {t('home.startCoding')}
                <ArrowRight size={18} className={styles.btnIcon} />
              </Button>
            </Link>
            <Link href="/workspace">
              <Button 
                size="large" 
                icon={<BookOpen size={20} />}
                className={styles.secondaryBtn}
              >
                {t('home.viewProblems')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className={styles.featuresSection}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className={styles.featureCard} bordered>
                <div className={styles.featureContent}>
                  <div className={styles.featureIconWrapper}>
                    {feature.icon}
                  </div>
                  <Title level={4} className={styles.featureTitle}>{feature.title}</Title>
                  <Text className={styles.featureDescription}>{feature.description}</Text>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className={styles.statsSection}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <Card className={styles.statsCard}>
          <div className={styles.statsGrid}>
            <motion.div variants={itemVariants} className={styles.statItem}>
              <div className={styles.statValue}>50+</div>
              <div className={styles.statLabel}>{t('home.stats.problems')}</div>
            </motion.div>
            <motion.div variants={itemVariants} className={styles.statItem}>
              <div className={styles.statValue}>1000+</div>
              <div className={styles.statLabel}>{t('home.stats.submissions')}</div>
            </motion.div>
            <motion.div variants={itemVariants} className={styles.statItem}>
              <div className={styles.statValue}>100+</div>
              <div className={styles.statLabel}>{t('home.stats.users')}</div>
            </motion.div>
          </div>
        </Card>
      </motion.section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Code size={24} weight="duotone" className={styles.footerLogoIcon} />
            <Text type="secondary">{t('header.title')}</Text>
          </div>
          <Text className={styles.footerCopyright}>
            &copy; {new Date().getFullYear()} {t('header.title')}. All rights reserved.
          </Text>
        </div>
      </footer>
    </div>
  )
}
