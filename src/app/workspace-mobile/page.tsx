'use client'

import { useState } from 'react'
import { Tabs, Button, Spin, Typography, Tag, Input } from 'antd'
import { 
  Code, 
  ChartBar, 
  List,
  CaretLeft,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { ProblemList } from '@/components/ProblemList'
import { ProblemDetail } from '@/components/ProblemDetail'
import { SubmissionHistory } from '@/components/SubmissionHistory'
import { DashboardStats } from '@/components/DashboardStats'
import { MobileLayout } from '@/components/MobileLayout'
import { useDailyProblemRecommendation, useI18n, useProblems, useSubmissions, useUIState, useAuth } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { Submission } from '@/lib/api'
import Link from 'next/link'

const { Text } = Typography

export default function MobileWorkspacePage() {
  const { t } = useI18n()
  useMobileRedirect()
  const { problems, loading: problemsLoading, searchProblems, refresh: refreshProblems } = useProblems()
  const { recommendation: dailyRecommendation, loading: dailyRecommendationLoading } = useDailyProblemRecommendation()
  const [searchKeyword, setSearchKeyword] = useState('')
  const { submissions, loading: submissionsLoading, submitCode, getSolvedProblemIds, getProblemSubmissions } = useSubmissions()
  const { user, isAuthenticated } = useAuth()
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
  // selectProblem 只保存题目 ID，移动端同样只展示当前题目缓存中可打开的推荐。
  const visibleDailyRecommendation = dailyRecommendation?.problem && problems.some(problem => problem.id === dailyRecommendation.problem?.id)
    ? dailyRecommendation
    : null
  const loading = problemsLoading || submissionsLoading

  const handleSubmitCode = async (problemId: string, code: string, language: string = 'JavaScript'): Promise<Submission | undefined> => {
    const submission = await submitCode({
      problemId: Number(problemId),
      code,
      language,
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

  // If a problem is selected, show it full screen
  if (selectedProblem) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button 
            type="text" 
            icon={<CaretLeft size={20} />} 
            onClick={clearSelectedProblem}
            style={{ padding: '4px 8px' }}
          />
          <Text strong style={{ fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedProblem.title}
          </Text>
        </div>
        <div style={{ padding: '0' }}>
          <ProblemDetail
            problem={selectedProblem}
            submissions={getProblemSubmissions(Number(selectedProblem.id))}
            onBack={clearSelectedProblem}
            onSubmit={handleSubmitCode}
          />
        </div>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ChartBar size={16} />
          {t('tabs.dashboard')}
        </span>
      ),
      children: (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ padding: '0 4px' }}
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Code size={16} />
          {t('tabs.problems')}
        </span>
      ),
      children: (
        <div>
          {/* Search & Filter */}
          <div style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder={t('problems.searchPlaceholder')}
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={(value) => {
                if (value.trim()) {
                  searchProblems(value.trim())
                } else {
                  refreshProblems()
                }
              }}
              onClear={() => refreshProblems()}
              style={{ width: '100%', marginBottom: 8 }}
            />
            {(user?.role === 'instructor' || user?.role === 'admin') && (
              <div style={{ marginBottom: 8 }}>
                <Link href="/workspace/createProblem">
                  <Button type="primary" block>
                    我要出题
                  </Button>
                </Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(level => (
                <Tag
                  key={level}
                  color={filterDifficulty === level ? 'blue' : undefined}
                  style={{ 
                    cursor: 'pointer', 
                    borderRadius: 12,
                    padding: '2px 12px',
                    fontSize: 12,
                  }}
                  onClick={() => setDifficultyFilter(level)}
                >
                  {getDifficultyLabel(level)}
                </Tag>
              ))}
            </div>
          </div>
          <ProblemList
            problems={filteredProblems}
            solvedProblems={solvedProblems}
            dailyRecommendation={visibleDailyRecommendation}
            dailyRecommendationLoading={isAuthenticated && dailyRecommendationLoading}
            onSelectProblem={selectProblem}
          />
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <List size={16} />
          {t('tabs.history')}
        </span>
      ),
      children: (
        <div>
          <SubmissionHistory
            submissions={submissions}
            problems={problems}
            onViewProblem={selectProblem}
          />
        </div>
      ),
    },
  ]

  return (
    <MobileLayout
      headerTitle={t('header.title')}
      headerLeft={
        <Code size={24} weight="duotone" style={{ color: '#4f46e5' }} />
      }
    >
      <Spin spinning={loading} size="large">
        <div style={{ padding: '12px 16px 0' }}>
          <Tabs
            activeKey={activeTab}
            onChange={switchTab}
            items={tabItems}
            size="small"
          />
        </div>
      </Spin>
    </MobileLayout>
  )
}
