'use client'

import { useState, useEffect } from 'react'
import { Problem, Submission } from '@/lib/api'
import { Card, Button, Tag, Divider, Typography, Empty, Select, Spin } from 'antd'
import { 
  ArrowLeftOutlined, 
  PlayCircleFilled, 
  CheckCircleFilled, 
  CloseCircleFilled,
  ClockCircleOutlined,
  BookOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'
import { CodeEditor } from '@/components/CodeEditor'
import { useWebSocket } from '@/hooks/use-websocket'
import { useAppStore } from '@/store/appStore'

const { Title, Text, Paragraph } = Typography

interface ProblemDetailProps {
  problem: Problem
  submissions: Submission[]
  onBack: () => void
  onSubmit: (problemId: string, code: string, language: string) => Promise<Submission | undefined> | Submission | undefined
}

export function ProblemDetail({ problem, submissions, onBack, onSubmit }: ProblemDetailProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null)
  const { on } = useWebSocket()
  const updateSubmission = useAppStore(s => s.updateSubmission)

  // 监听 WebSocket 评测结果
  useEffect(() => {
    const unsubscribe = on('judge_result', (msg) => {
      const result = msg.content
      if (!result) return

      // 更新 store 中的提交记录
      updateSubmission(result.submissionId, {
        status: result.status,
        score: result.score,
        testResults: result.testResults,
      })

      // 如果是当前正在等待的提交，更新 lastSubmission
      setLastSubmission(prev => {
        if (prev && prev.id === result.submissionId) {
          return { ...prev, status: result.status, score: result.score, testResults: result.testResults }
        }
        return prev
      })

      setIsSubmitting(false)
    })

    return unsubscribe
  }, [on, updateSubmission])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const result = await onSubmit(String(problem.id), code, language)
    if (result) {
      setLastSubmission(result)
      // 如果不是 Pending 状态（同步评测），1秒后恢复按钮
      if (result.status !== 'Pending') {
        setTimeout(() => setIsSubmitting(false), 1000)
      }
      // Pending 状态的 isSubmitting 会在 WebSocket 收到结果后恢复
    } else {
      setIsSubmitting(false)
    }
  }

  const recentSubmissions = (submissions || [])
    .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
    .slice(0, 5)

  const getStatusIcon = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
      case 'Wrong Answer':
      case 'Runtime Error':
        return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
      case 'Pending':
        return <LoadingOutlined style={{ color: '#1677ff', fontSize: 16 }} spin />
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />
    }
  }

  const getStatusColor = (status: Submission['status']): "success" | "error" | "warning" | "default" | "processing" => {
    switch (status) {
      case 'Accepted':
        return 'success'
      case 'Wrong Answer':
        return 'error'
      case 'Runtime Error':
        return 'warning'
      case 'Pending':
        return 'processing'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          {t('problemDetail.backToList')}
        </Button>
        <Title level={3} style={{ margin: 0 }}>{problem.title}</Title>
        <Button
          icon={<BookOutlined />}
          onClick={() => router.push(`/solutions/${problem.id}`)}
        >
          {t('solutions.entrance')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <Title level={5}>{t('problemDetail.description')}</Title>
            <Paragraph className="text-sm leading-relaxed">{problem.description}</Paragraph>

            <Divider />

            <div className="space-y-4">
              <div>
                <Text strong className="text-sm">{t('problemDetail.inputFormat')}</Text>
                <Paragraph type="secondary" className="text-sm whitespace-pre-line">{problem.inputFormat}</Paragraph>
              </div>

              <div>
                <Text strong className="text-sm">{t('problemDetail.outputFormat')}</Text>
                <Paragraph type="secondary" className="text-sm whitespace-pre-line">{problem.outputFormat}</Paragraph>
              </div>

              <div>
                <Text strong className="text-sm">{t('problemDetail.constraints')}</Text>
                <Paragraph type="secondary" className="text-sm whitespace-pre-line">{problem.constraints}</Paragraph>
              </div>
            </div>

            <Divider />

            <div>
              <Text strong className="text-sm">{t('problemDetail.examples')}</Text>
              <div className="space-y-4 mt-3">
                {(problem.examples || []).map((example, idx) => (
                  <Card key={idx} size="small" style={{ backgroundColor: '#fafafa' }}>
                    <div className="space-y-2">
                      <div>
                        <Text type="secondary" className="text-xs">{t('problemDetail.input')}:</Text>
                        <pre className="text-sm font-mono bg-white p-2 rounded mt-1">{example.input}</pre>
                      </div>
                      <div>
                        <Text type="secondary" className="text-xs">{t('problemDetail.output')}:</Text>
                        <pre className="text-sm font-mono bg-white p-2 rounded mt-1">{example.output}</pre>
                      </div>
                      {example.explanation && (
                        <div>
                          <Text type="secondary" className="text-xs">{t('problemDetail.explanation')}:</Text>
                          <Paragraph type="secondary" className="text-xs mt-1">{example.explanation}</Paragraph>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>

          <Card title={t('problemDetail.recentSubmissions')}>
            {recentSubmissions.length === 0 ? (
              <Empty description={t('problemDetail.noSubmissions')} />
            ) : (
              <div className="space-y-2">
                {recentSubmissions.map(sub => (
                  <div 
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/submission/${sub.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sub.status)}
                      <div>
                        <Text strong className="text-sm">{sub.status}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {sub.submittedAt ? format(new Date(sub.submittedAt), 'MMM d, HH:mm') : '-'}
                        </Text>
                      </div>
                    </div>
                    <Tag color={getStatusColor(sub.status)}>
                      {sub.score}%
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t('problemDetail.yourCode')}>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="400px"
              placeholder={t('problemDetail.writeCodeHere')}
            />
            <div style={{ marginTop: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="secondary" className="text-xs">
                {t('problemDetail.language')}：
              </Text>
              <Select
                value={language}
                onChange={setLanguage}
                style={{ width: 140 }}
                size="small"
                options={[
                  { value: 'JavaScript', label: 'JavaScript' },
                  { value: 'C', label: 'C' },
                ]}
              />
            </div>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !code.trim()}
              block
              size="large"
              icon={<PlayCircleFilled />}
              style={{ marginTop: 16 }}
            >
              {isSubmitting ? (lastSubmission?.status === 'Pending' ? t('messages.judging') : t('problemDetail.submitting')) : t('problemDetail.submit')}
            </Button>
          </Card>

          {lastSubmission && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card title={lastSubmission.status === 'Pending' ? t('messages.judging') : t('problemDetail.testResults')}>
                {lastSubmission.status === 'Pending' ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary">{t('messages.judgingDesc')}</Text>
                    </div>
                  </div>
                ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Text strong className="text-sm">{t('history.status')}</Text>
                    <Tag color={getStatusColor(lastSubmission.status)}>
                      {lastSubmission.status}
                    </Tag>
                  </div>
                  <div className="flex items-center justify-between">
                    <Text strong className="text-sm">{t('history.score')}</Text>
                    <Text strong className="text-lg">{lastSubmission.score}%</Text>
                  </div>
                  <Divider />
                  <div>
                    <Text strong className="text-sm">{t('problemDetail.testCase')}</Text>
                    <div className="space-y-2 mt-2">
                      {lastSubmission.testResults?.map((result, idx) => (
                        <div 
                          key={result.testCaseId}
                          className="flex items-center justify-between p-2 rounded bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            {result.passed ? (
                              <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                            ) : (
                              <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
                            )}
                            <Text className="text-sm">{t('problemDetail.testCase')} {idx + 1}</Text>
                          </div>
                          {result.executionTime !== undefined && (
                            <Text type="secondary" className="text-xs">{result.executionTime}ms</Text>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Divider />
                  <Button 
                    type="primary" 
                    ghost 
                    block
                    onClick={() => router.push(`/submission/${lastSubmission.id}`)}
                  >
                    {t('submission.viewDetail')}
                  </Button>
                </div>
                )}
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
