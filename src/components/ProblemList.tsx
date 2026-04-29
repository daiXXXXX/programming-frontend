'use client'

import { DailyProblemRecommendation, DifficultyLevel, Problem } from '@/lib/api'
import { Card, Tag, Empty, Typography } from 'antd'
import { ArrowRightOutlined, CalendarOutlined, CheckCircleFilled, FireOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'

const { Text, Title } = Typography

interface ProblemListProps {
  problems: Problem[]
  solvedProblems: Set<number>
  dailyRecommendation?: DailyProblemRecommendation | null
  dailyRecommendationLoading?: boolean
  onSelectProblem: (problem: Problem) => void
}

const difficultyColors: Record<DifficultyLevel, string> = {
  Easy: 'green',
  Medium: 'orange',
  Hard: 'red'
}

export function ProblemList({
  problems,
  solvedProblems,
  dailyRecommendation,
  dailyRecommendationLoading = false,
  onSelectProblem,
}: ProblemListProps) {
  const { t } = useI18n()
  const dailyProblem = dailyRecommendation?.problem && !solvedProblems.has(dailyRecommendation.problem.id)
    ? dailyRecommendation.problem
    : null
  const listProblems = dailyProblem
    ? problems.filter(problem => problem.id !== dailyProblem.id)
    : problems
  
  if (listProblems.length === 0 && !dailyProblem && !dailyRecommendationLoading) {
    return (
      <Card>
        <Empty
          image={<FireOutlined style={{ fontSize: 48, color: '#999' }} />}
          description={
            <div>
              <Title level={5}>{t('problems.noProblems')}</Title>
              <Text type="secondary">{t('dashboard.noActivity')}</Text>
            </div>
          }
        />
      </Card>
    )
  }

  const renderRecommendationReason = () => {
    if (!dailyRecommendation || dailyRecommendation.reason === 'cold_start') {
      return t('problems.dailyColdStart')
    }
    if (dailyRecommendation.matchedTags?.length) {
      return `${t('problems.dailyMatchedTags')} ${dailyRecommendation.matchedTags.slice(0, 3).join(' / ')}`
    }
    return t('problems.dailyMatchedDifficulty')
  }

  return (
    <div className="space-y-3">
      {dailyRecommendationLoading && !dailyProblem && (
        <Card loading styles={{ body: { padding: '16px 20px' } }} />
      )}

      {dailyProblem && (
        <motion.div
          key={`daily-${dailyProblem.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            hoverable
            className="cursor-pointer"
            onClick={() => onSelectProblem(dailyProblem)}
            styles={{
              body: {
                padding: '18px 20px',
                background: 'linear-gradient(135deg, #fff7e6 0%, #f6ffed 100%)',
                borderRadius: 8,
              },
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <CalendarOutlined style={{ fontSize: 22 }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Tag color="gold" style={{ marginInlineEnd: 0 }}>{t('problems.dailyTitle')}</Tag>
                  <Text strong className="text-lg">{dailyProblem.title}</Text>
                </div>
                <Text type="secondary" className="text-sm">{renderRecommendationReason()}</Text>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {(dailyProblem.tags || []).map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <Tag color={difficultyColors[dailyProblem.difficulty]}>
                  {dailyProblem.difficulty}
                </Tag>
                <ArrowRightOutlined style={{ color: '#d48806' }} />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {listProblems.map((problem, index) => {
        const isSolved = solvedProblems.has(problem.id)
        
        return (
          <motion.div
            key={problem.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <Card
              hoverable
              className="cursor-pointer"
              onClick={() => onSelectProblem(problem)}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 text-center">
                  {isSolved ? (
                    <CheckCircleFilled style={{ fontSize: 24, color: '#52c41a' }} />
                  ) : (
                    <Text type="secondary" className="font-mono">{index + 1}</Text>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Text strong className="text-lg">{problem.title}</Text>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {problem.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Tag color={difficultyColors[problem.difficulty]}>
                    {problem.difficulty}
                  </Tag>
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
