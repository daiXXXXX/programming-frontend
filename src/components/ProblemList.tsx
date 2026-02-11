'use client'

import { Problem, DifficultyLevel } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Fire } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'

interface ProblemListProps {
  problems: Problem[]
  solvedProblems: Set<number>
  onSelectProblem: (problem: Problem) => void
}

const difficultyColors: Record<DifficultyLevel, string> = {
  Easy: 'bg-success/10 text-success border-success/20',
  Medium: 'bg-warning/10 text-warning border-warning/20',
  Hard: 'bg-destructive/10 text-destructive border-destructive/20'
}

export function ProblemList({ problems, solvedProblems, onSelectProblem }: ProblemListProps) {
  const { t } = useI18n()
  
  if (problems.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Fire size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
        <h3 className="font-semibold mb-2">{t.problems.noProblems}</h3>
        <p className="text-sm text-muted-foreground">
          {t.dashboard.noActivity}
        </p>
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
              className="p-5 cursor-pointer hover:shadow-md transition-all hover:border-accent/40"
              onClick={() => onSelectProblem(problem)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 text-center">
                  {isSolved ? (
                    <CheckCircle size={24} weight="fill" className="text-success" />
                  ) : (
                    <span className="text-muted-foreground font-mono">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{problem.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {problem.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Badge className={difficultyColors[problem.difficulty]}>
                    {problem.difficulty}
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
