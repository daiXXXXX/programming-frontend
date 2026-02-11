'use client'

import { Problem, Submission } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Code as CodeIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useI18n } from '@/hooks/use-i18n'

interface SubmissionHistoryProps {
  submissions: Submission[]
  problems: Problem[]
  onViewProblem: (problem: Problem) => void
}

export function SubmissionHistory({ submissions, problems, onViewProblem }: SubmissionHistoryProps) {
  const { t } = useI18n()
  
  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CodeIcon size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
        <h3 className="font-semibold mb-2">{t.history.noSubmissions}</h3>
        <p className="text-sm text-muted-foreground">
          {t.dashboard.noActivity}
        </p>
      </Card>
    )
  }

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )

  const getStatusIcon = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle size={18} weight="fill" className="text-success" />
      default:
        return <XCircle size={18} weight="fill" className="text-destructive" />
    }
  }

  const getStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return 'bg-success/10 text-success border-success/20'
      case 'Wrong Answer':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'Runtime Error':
        return 'bg-warning/10 text-warning border-warning/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusText = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return t.status.accepted
      case 'Wrong Answer':
        return t.status.wrongAnswer
      case 'Runtime Error':
        return t.status.runtimeError
      default:
        return t.status.pending
    }
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.history.problem}</TableHead>
            <TableHead>{t.history.status}</TableHead>
            <TableHead>{t.history.score}</TableHead>
            <TableHead>{t.history.language}</TableHead>
            <TableHead>{t.history.submittedAt}</TableHead>
            <TableHead>{t.history.view}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSubmissions.map(submission => {
            const problem = problems.find(p => p.id === submission.problemId)
            if (!problem) return null

            return (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">{problem.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status)}
                    <Badge className={getStatusColor(submission.status)}>
                      {getStatusText(submission.status)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">{submission.score}%</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{submission.language}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(submission.submittedAt), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewProblem(problem)}
                  >
                    {t.history.view}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
