'use client'

import { useState } from 'react'
import { Problem, Submission } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  XCircle,
  Clock
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'

interface ProblemDetailProps {
  problem: Problem
  submissions: Submission[]
  onBack: () => void
  onSubmit: (problemId: string, code: string) => Promise<Submission | undefined> | Submission | undefined
}

export function ProblemDetail({ problem, submissions, onBack, onSubmit }: ProblemDetailProps) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const result = await onSubmit(String(problem.id), code)
    if (result) {
      setLastSubmission(result)
    }
    setTimeout(() => setIsSubmitting(false), 1000)
  }

  const recentSubmissions = submissions
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5)

  const getStatusIcon = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircle size={16} weight="fill" className="text-success" />
      case 'Wrong Answer':
      case 'Runtime Error':
        return <XCircle size={16} weight="fill" className="text-destructive" />
      default:
        return <Clock size={16} className="text-muted-foreground" />
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={18} />
          {t.problemDetail.backToList}
        </Button>
        <h2 className="text-2xl font-bold">{problem.title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">{t.problemDetail.description}</h3>
            <p className="text-sm leading-relaxed mb-4">{problem.description}</p>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">{t.problemDetail.inputFormat}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{problem.inputFormat}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">{t.problemDetail.outputFormat}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{problem.outputFormat}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">{t.problemDetail.constraints}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{problem.constraints}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="font-medium text-sm mb-3">{t.problemDetail.examples}</h4>
              <div className="space-y-4">
                {problem.examples.map((example, idx) => (
                  <Card key={idx} className="p-4 bg-muted/30">
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">{t.problemDetail.input}:</div>
                        <pre className="text-sm font-mono bg-background p-2 rounded">{example.input}</pre>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">{t.problemDetail.output}:</div>
                        <pre className="text-sm font-mono bg-background p-2 rounded">{example.output}</pre>
                      </div>
                      {example.explanation && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">{t.problemDetail.explanation}:</div>
                          <p className="text-xs text-muted-foreground">{example.explanation}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">{t.problemDetail.recentSubmissions}</h3>
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.problemDetail.noSubmissions}</p>
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map(sub => (
                  <div 
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sub.status)}
                      <div>
                        <div className="text-sm font-medium">{sub.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(sub.submittedAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(sub.status)}>
                      {sub.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">{t.problemDetail.yourCode}</h3>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.problemDetail.writeCodeHere}
              className="font-mono text-sm min-h-[400px] resize-y"
              id="code-editor"
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !code.trim()}
              className="w-full mt-4 gap-2"
              size="lg"
            >
              <Play size={20} weight="fill" />
              {isSubmitting ? t.problemDetail.submitting : t.problemDetail.submit}
            </Button>
          </Card>

          {lastSubmission && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">{t.problemDetail.testResults}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.history.status}</span>
                    <Badge className={getStatusColor(lastSubmission.status)}>
                      {lastSubmission.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.history.score}</span>
                    <span className="text-lg font-bold">{lastSubmission.score}%</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium mb-2">{t.problemDetail.testCase}</div>
                    <div className="space-y-2">
                      {lastSubmission.testResults.map((result, idx) => (
                        <div 
                          key={result.testCaseId}
                          className="flex items-center justify-between p-2 rounded bg-muted/20"
                        >
                          <div className="flex items-center gap-2">
                            {result.passed ? (
                              <CheckCircle size={16} weight="fill" className="text-success" />
                            ) : (
                              <XCircle size={16} weight="fill" className="text-destructive" />
                            )}
                            <span className="text-sm">{t.problemDetail.testCase} {idx + 1}</span>
                          </div>
                          {result.executionTime !== undefined && (
                            <span className="text-xs text-muted-foreground">{result.executionTime}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
