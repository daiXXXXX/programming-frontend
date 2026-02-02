import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Experiment, Submission } from '@/lib/types'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Trophy } from '@phosphor-icons/react'

interface StudentProgressTableProps {
  experiments: Experiment[]
  submissions: Submission[]
  onViewExperiment?: (experiment: Experiment) => void
}

export function StudentProgressTable({ 
  experiments, 
  submissions,
  onViewExperiment 
}: StudentProgressTableProps) {
  const experimentProgress = useMemo(() => {
    return experiments.map(exp => {
      const expSubmissions = submissions
        .filter(s => s.experimentId === exp.id)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

      const bestSubmission = expSubmissions.reduce((best, current) => 
        current.score > (best?.score || 0) ? current : best
      , expSubmissions[0])

      const latestSubmission = expSubmissions[0]
      const isPassed = expSubmissions.some(s => s.status === 'passed')
      const attemptCount = expSubmissions.length

      const avgScore = expSubmissions.length > 0
        ? Math.round(expSubmissions.reduce((sum, s) => sum + s.score, 0) / expSubmissions.length)
        : 0

      const improvement = expSubmissions.length >= 2
        ? expSubmissions[0].score - expSubmissions[expSubmissions.length - 1].score
        : 0

      return {
        experiment: exp,
        bestScore: bestSubmission?.score || 0,
        latestScore: latestSubmission?.score || 0,
        avgScore,
        isPassed,
        attemptCount,
        improvement,
        lastAttempt: latestSubmission?.submittedAt,
        testsPassed: latestSubmission?.testResults.filter(t => t.passed).length || 0,
        totalTests: exp.testCases.length
      }
    })
  }, [experiments, submissions])

  const sortedProgress = useMemo(() => {
    return [...experimentProgress].sort((a, b) => {
      if (a.isPassed && !b.isPassed) return 1
      if (!a.isPassed && b.isPassed) return -1
      return b.attemptCount - a.attemptCount
    })
  }, [experimentProgress])

  if (experiments.length === 0) {
    return (
      <Card className="p-12 text-center">
        <h3 className="font-semibold mb-2">No Experiments Available</h3>
        <p className="text-sm text-muted-foreground">
          Experiments will appear here once created
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Experiment</TableHead>
              <TableHead className="font-semibold text-center">Status</TableHead>
              <TableHead className="font-semibold text-center">Attempts</TableHead>
              <TableHead className="font-semibold text-center">Best Score</TableHead>
              <TableHead className="font-semibold text-center">Latest Score</TableHead>
              <TableHead className="font-semibold text-center">Avg Score</TableHead>
              <TableHead className="font-semibold text-center">Progress</TableHead>
              <TableHead className="font-semibold">Last Attempt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProgress.map((progress) => (
              <TableRow 
                key={progress.experiment.id}
                className="cursor-pointer hover:bg-accent/5"
                onClick={() => onViewExperiment?.(progress.experiment)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {progress.isPassed && (
                      <Trophy size={16} className="text-success" weight="fill" />
                    )}
                    <div>
                      <div className="font-semibold">{progress.experiment.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {progress.testsPassed}/{progress.totalTests} tests passed
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell className="text-center">
                  {progress.attemptCount === 0 ? (
                    <Badge variant="outline" className="gap-1">
                      <Clock size={14} />
                      Not Started
                    </Badge>
                  ) : progress.isPassed ? (
                    <Badge className="gap-1 bg-success text-success-foreground">
                      <CheckCircle size={14} weight="fill" />
                      Passed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-warning text-warning-foreground">
                      <XCircle size={14} weight="fill" />
                      In Progress
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <span className="font-mono font-semibold">{progress.attemptCount}</span>
                </TableCell>

                <TableCell className="text-center">
                  {progress.attemptCount > 0 ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-mono font-bold text-lg ${
                        progress.bestScore >= 80 ? 'text-success' : 
                        progress.bestScore >= 60 ? 'text-warning' : 
                        'text-destructive'
                      }`}>
                        {progress.bestScore}%
                      </span>
                      {progress.bestScore === 100 && (
                        <span className="text-xs text-success">Perfect!</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  {progress.attemptCount > 0 ? (
                    <span className="font-mono font-semibold">{progress.latestScore}%</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  {progress.attemptCount > 0 ? (
                    <span className="font-mono font-semibold">{progress.avgScore}%</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>

                <TableCell>
                  {progress.attemptCount > 0 ? (
                    <div className="w-full min-w-[100px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {progress.testsPassed}/{progress.totalTests}
                        </span>
                        {progress.improvement > 0 && (
                          <span className="text-xs text-success font-semibold">
                            +{progress.improvement}%
                          </span>
                        )}
                      </div>
                      <Progress 
                        value={(progress.testsPassed / progress.totalTests) * 100} 
                        className="h-2"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not started</span>
                  )}
                </TableCell>

                <TableCell>
                  {progress.lastAttempt ? (
                    <div className="text-sm">
                      <div className="font-medium">
                        {format(new Date(progress.lastAttempt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(progress.lastAttempt), 'HH:mm')}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
