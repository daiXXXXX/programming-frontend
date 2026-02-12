'use client'

import { Tabs, Button, Space, Spin, Typography, Dropdown, Avatar } from 'antd'
import { 
  Code, 
  ChartBar, 
  List,
  Trophy,
} from '@phosphor-icons/react'
import { UserOutlined, LogoutOutlined, LoginOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { ProblemList } from '@/components/ProblemList'
import { ProblemDetail } from '@/components/ProblemDetail'
import { SubmissionHistory } from '@/components/SubmissionHistory'
import { DashboardStats } from '@/components/DashboardStats'
import { motion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n, useProblems, useSubmissions, useUIState, useAuth, getRoleLabel } from '@/hooks'
import { Submission } from '@/lib/api'
import styles from './page.module.css'

const { Title, Text } = Typography

export default function WorkspacePage() {
  const { t } = useI18n()
  const { problems, loading: problemsLoading } = useProblems()
  const { submissions, loading: submissionsLoading, submitCode, getSolvedProblemIds, getProblemSubmissions } = useSubmissions()
  const { user, isAuthenticated, logout } = useAuth()
  const { 
    activeTab, 
    filterDifficulty, 
    switchTab, 
    selectProblem, 
    getSelectedProblem, 
    clearSelectedProblem,
    setDifficultyFilter,
    getFilteredProblems 
  } = useUIState()

  const selectedProblem = getSelectedProblem()
  const filteredProblems = getFilteredProblems()
  const solvedProblems = getSolvedProblemIds()
  const loading = problemsLoading || submissionsLoading

  const handleSubmitCode = async (problemId: string, code: string): Promise<Submission | undefined> => {
    const submission = await submitCode({
      problemId: Number(problemId),
      code,
      language: 'JavaScript'
    })
    return submission ?? undefined
  }

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'All': return t('problems.all')
      case 'Easy': return t('problems.easy')
      case 'Medium': return t('problems.medium')
      case 'Hard': return t('problems.hard')
      default: return level
    }
  }

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span className="flex items-center gap-2">
          <ChartBar size={18} />
          {t('tabs.dashboard')}
        </span>
      ),
      children: (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DashboardStats 
            problems={problems}
            submissions={submissions}
            onViewProblem={selectProblem}
          />
        </motion.div>
      ),
    },
    {
      key: 'problems',
      label: (
        <span className="flex items-center gap-2">
          <Code size={18} />
          {t('tabs.problems')}
        </span>
      ),
      children: !selectedProblem ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <Title level={3} style={{ margin: 0 }}>{t('problems.title')}</Title>
            <Space>
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(level => (
                <Button
                  key={level}
                  type={filterDifficulty === level ? 'primary' : 'default'}
                  size="middle"
                  onClick={() => setDifficultyFilter(level)}
                >
                  {getDifficultyLabel(level)}
                </Button>
              ))}
            </Space>
          </div>
          <ProblemList
            problems={filteredProblems}
            solvedProblems={solvedProblems}
            onSelectProblem={selectProblem}
          />
        </>
      ) : (
        <ProblemDetail
          problem={selectedProblem}
          submissions={getProblemSubmissions(Number(selectedProblem.id))}
          onBack={clearSelectedProblem}
          onSubmit={handleSubmitCode}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-2">
          <List size={18} />
          {t('tabs.history')}
        </span>
      ),
      children: (
        <>
          <Title level={3}>{t('history.title')}</Title>
          <SubmissionHistory
            submissions={submissions}
            problems={problems}
            onViewProblem={selectProblem}
          />
        </>
      ),
    },
  ]

  return (
    <Spin spinning={loading} size="large">
      <div className={`min-h-screen bg-gray-50 ${styles.container}`}>
        <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Code size={32} weight="duotone" className="text-indigo-600" />
                <div>
                  <Title level={4} style={{ margin: 0 }}>{t('header.title')}</Title>
                  <Text type="secondary">{t('header.subtitle')}</Text>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy size={20} className="text-amber-500" weight="fill" />
                  <span className="font-semibold">{solvedProblems.size}</span>
                  <Text type="secondary">{t('header.solved')}</Text>
                </div>
                <Link href="/ranking">
                  <Button type="text" className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600">
                    <Trophy size={18} weight="duotone" />
                    <span>{t('header.ranking')}</span>
                  </Button>
                </Link>
                <LanguageSwitcher />
                
                {isAuthenticated && user ? (
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'user-info',
                          label: (
                            <div className="px-2 py-1">
                              <div className="font-medium">{user.username}</div>
                              <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                            </div>
                          ),
                          disabled: true,
                        },
                        { type: 'divider' },
                        {
                          key: 'logout',
                          icon: <LogoutOutlined />,
                          label: t('common.logout'),
                          onClick: logout,
                        },
                      ],
                    }}
                    placement="bottomRight"
                  >
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                      <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                      <span className="text-sm font-medium">{user.username}</span>
                    </div>
                  </Dropdown>
                ) : (
                  <Link href="/login">
                    <Button type="primary" icon={<LoginOutlined />}>
                      {t('common.login')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <Tabs 
            activeKey={activeTab} 
            onChange={switchTab}
            items={tabItems}
            size="large"
          />
        </main>
      </div>
    </Spin>
  )
}
