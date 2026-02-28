'use client'

import { useState, useEffect } from 'react'
import { Tabs, Typography, Avatar, Spin, Empty, Card } from 'antd'
import { Trophy, Medal, Crown, ArrowLeft } from '@phosphor-icons/react'
import { UserOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { api, RankingUser } from '@/lib/api'
import { useI18n } from '@/hooks'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import styles from './ranking.module.css'

const { Title, Text } = Typography

// 获取排名图标
function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown size={24} weight="fill" className="text-yellow-500" />
    case 2:
      return <Medal size={24} weight="fill" className="text-gray-400" />
    case 3:
      return <Medal size={24} weight="fill" className="text-amber-600" />
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>
  }
}

// 排行榜项组件
function RankingItem({ user, showTodaySolved = false }: { user: RankingUser; showTodaySolved?: boolean }) {
  const isTopThree = user.rank <= 3

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: user.rank * 0.03 }}
      className={`${styles.rankingItem} ${isTopThree ? styles.topThree : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-8 flex justify-center">
          {getRankIcon(user.rank)}
        </div>
        <Avatar 
          size={40} 
          src={user.avatar || undefined}
          icon={!user.avatar && <UserOutlined />}
          style={{ backgroundColor: isTopThree ? '#1677ff' : '#d9d9d9' }}
        />
        <div className="flex-1">
          <Text strong className={isTopThree ? 'text-base' : 'text-sm'}>
            {user.username}
          </Text>
        </div>
        <div className="text-right">
          <Text strong className="text-lg text-indigo-600">
            {showTodaySolved ? user.todaySolved : user.totalSolved}
          </Text>
          <Text type="secondary" className="text-xs ml-1">
            题
          </Text>
        </div>
      </div>
    </motion.div>
  )
}

// 排行榜列表组件
function RankingList({ users, loading, showTodaySolved = false }: { 
  users: RankingUser[]
  loading: boolean
  showTodaySolved?: boolean 
}) {
  const { t } = useI18n()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <Empty 
        description={t('ranking.noData')} 
        className="py-12"
      />
    )
  }

  return (
    <div className={styles.rankingList}>
      {users.map((user) => (
        <RankingItem 
          key={user.userId} 
          user={user} 
          showTodaySolved={showTodaySolved}
        />
      ))}
    </div>
  )
}

export default function RankingPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('total')
  const [totalRanking, setTotalRanking] = useState<RankingUser[]>([])
  const [todayRanking, setTodayRanking] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)
      try {
        const [total, today] = await Promise.all([
          api.getTotalSolvedRanking(50),
          api.getTodaySolvedRanking(50),
        ])
        setTotalRanking(total || [])
        setTodayRanking(today || [])
      } catch (error) {
        console.error('Failed to fetch rankings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRankings()
  }, [])

  const tabItems = [
    {
      key: 'total',
      label: (
        <span className="flex items-center gap-2">
          <Trophy size={18} weight="fill" />
          {t('ranking.totalTab')}
        </span>
      ),
      children: (
        <RankingList 
          users={totalRanking} 
          loading={loading}
        />
      ),
    },
    {
      key: 'today',
      label: (
        <span className="flex items-center gap-2">
          <Medal size={18} weight="fill" />
          {t('ranking.todayTab')}
        </span>
      ),
      children: (
        <RankingList 
          users={todayRanking} 
          loading={loading}
          showTodaySolved
        />
      ),
    },
  ]

  return (
    <div className={`min-h-screen bg-gray-50 ${styles.container}`}>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/workspace" 
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>{t('common.back')}</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <Trophy size={28} weight="duotone" className="text-amber-500" />
                <Title level={4} style={{ margin: 0 }}>{t('ranking.title')}</Title>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card className={styles.rankingCard}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            centered
          />
        </Card>
      </main>
    </div>
  )
}
