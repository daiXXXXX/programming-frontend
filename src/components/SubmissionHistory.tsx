import { Problem, Submission } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Code as CodeIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'

interface SubmissionHistoryProps {
  submissions: Submission[]
  problems: Problem[]
  onViewProblem: (problem: Problem) => void
}

export function SubmissionHistory({ submissions, problems, onViewProblem }: SubmissionHistoryProps) {
  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CodeIcon size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
        <h3 className="font-semibold mb-2">No submissions yet</h3>
        <p className="text-sm text-muted-foreground">
          Start solving problems to see your submission history
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

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Problem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Submitted At</TableHead>
            <TableHead>Action</TableHead>
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
                      {submission.status}
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
                    View
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
