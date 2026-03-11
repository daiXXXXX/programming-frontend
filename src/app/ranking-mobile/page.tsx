'use client'

import { useState, useEffect } from 'react'
import { Tabs, Typography, Avatar, Spin, Empty, Card, Tag } from 'antd'
import { Trophy, Medal, Crown, ArrowLeft } from '@phosphor-icons/react'
import { UserOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { api, RankingUser } from '@/lib/api'
import { useI18n } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { MobileLayout } from '@/components/MobileLayout'

const { Title, Text } = Typography

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown size={20} weight="fill" className="text-yellow-500" />
    case 2:
      return <Medal size={20} weight="fill" className="text-gray-400" />
    case 3:
      return <Medal size={20} weight="fill" className="text-amber-600" />
    default:
      return <span style={{ width: 20, display: 'inline-flex', justifyContent: 'center', fontWeight: 700, color: '#999', fontSize: 13 }}>{rank}</span>
  }
}

function MobileRankingItem({ user, showTodaySolved = false }: { user: RankingUser; showTodaySolved?: boolean }) {
  const isTopThree = user.rank <= 3

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: user.rank * 0.02 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: isTopThree 
          ? 'linear-gradient(135deg, #fff7e6 0%, #fff1cc 100%)' 
          : '#fafafa',
        border: isTopThree ? '1px solid #ffd666' : '1px solid transparent',
      }}
    >
      <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
        {getRankIcon(user.rank)}
      </div>
      <Avatar
        size={36}
        src={user.avatar || undefined}
        icon={!user.avatar && <UserOutlined />}
        style={{ backgroundColor: isTopThree ? '#1677ff' : '#d9d9d9', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.username}
        </Text>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <Text strong style={{ fontSize: 18, color: '#4f46e5' }}>
          {showTodaySolved ? user.todaySolved : user.totalSolved}
        </Text>
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>题</Text>
      </div>
    </motion.div>
  )
}

function MobileRankingList({ users, loading, showTodaySolved = false }: { 
  users: RankingUser[]
  loading: boolean
  showTodaySolved?: boolean 
}) {
  const { t } = useI18n()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!users || users.length === 0) {
    return <Empty description={t('ranking.noData')} style={{ padding: 48 }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {users.map((user) => (
        <MobileRankingItem
          key={user.userId}
          user={user}
          showTodaySolved={showTodaySolved}
        />
      ))}
    </div>
  )
}

export default function MobileRankingPage() {
  const { t } = useI18n()
  useMobileRedirect()
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Trophy size={16} weight="fill" />
          {t('ranking.totalTab')}
        </span>
      ),
      children: <MobileRankingList users={totalRanking} loading={loading} />,
    },
    {
      key: 'today',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Medal size={16} weight="fill" />
          {t('ranking.todayTab')}
        </span>
      ),
      children: <MobileRankingList users={todayRanking} loading={loading} showTodaySolved />,
    },
  ]

  return (
    <MobileLayout
      headerTitle={t('ranking.title')}
      headerLeft={
        <Trophy size={22} weight="duotone" style={{ color: '#f59e0b' }} />
      }
    >
      <div style={{ padding: '8px 16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          centered
        />
      </div>
    </MobileLayout>
  )
}
