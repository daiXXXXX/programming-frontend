'use client'

import { Problem, DifficultyLevel } from '@/lib/api'
import { Card, Tag, Empty, Typography } from 'antd'
import { CheckCircleFilled, FireOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'

const { Text, Title } = Typography

interface ProblemListProps {
  problems: Problem[]
  solvedProblems: Set<number>
  onSelectProblem: (problem: Problem) => void
}

const difficultyColors: Record<DifficultyLevel, string> = {
  Easy: 'green',
  Medium: 'orange',
  Hard: 'red'
}

export function ProblemList({ problems, solvedProblems, onSelectProblem }: ProblemListProps) {
  const { t } = useI18n()
  
  if (problems.length === 0) {
    return (
      <Card>
        <Empty
          image={<FireOutlined style={{ fontSize: 48, color: '#999' }} />}
          description={
            <div>
              <Title level={5}>{t.problems.noProblems}</Title>
              <Text type="secondary">{t.dashboard.noActivity}</Text>
            </div>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {problems.map((problem, index) => {
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
