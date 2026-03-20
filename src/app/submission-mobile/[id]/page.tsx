'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card, Typography, Tag, Spin, Button, Descriptions, Progress, Collapse, Empty,
  Space,
} from 'antd'
import {
  CheckCircleFilled, CloseCircleFilled, ArrowLeftOutlined,
  ClockCircleOutlined, CodeOutlined,
} from '@ant-design/icons'
import { Code, CaretLeft } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { api, Submission, Problem, SubmissionStatus } from '@/lib/api'
import { useI18n } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import Editor from '@monaco-editor/react'

const { Title, Text } = Typography

const LANGUAGE_MAP: Record<string, string> = {
  'JavaScript': 'javascript',
  'C': 'c',
  'C++': 'cpp',
  'Python': 'python',
  'Java': 'java',
  'Go': 'go',
  'TypeScript': 'typescript',
}

function getStatusColor(status: SubmissionStatus): string {
  switch (status) {
    case 'Accepted': return 'green'
    case 'Wrong Answer': return 'red'
    case 'Runtime Error': return 'orange'
    case 'Time Limit Exceeded': return 'volcano'
    default: return 'default'
  }
}

function getStatusIcon(status: SubmissionStatus) {
  switch (status) {
    case 'Accepted':
      return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
    default:
      return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
  }
}

export default function MobileSubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useI18n()
  useMobileRedirect()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const submissionId = params.id as string

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const sub = await api.getSubmission(submissionId)
        setSubmission(sub)
        try {
          const prob = await api.getProblem(sub.problemId)
          setProblem(prob)
        } catch {
          // 题目可能已被删除
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('submission.loadError'))
      } finally {
        setLoading(false)
      }
    }
    if (submissionId) fetchData()
  }, [submissionId, t])

  const getStatusText = (status: SubmissionStatus) => {
    switch (status) {
      case 'Accepted': return t('status.accepted')
      case 'Wrong Answer': return t('status.wrongAnswer')
      case 'Runtime Error': return t('status.runtimeError')
      case 'Time Limit Exceeded': return t('submission.timeLimitExceeded')
      default: return t('status.pending')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
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
            onClick={() => router.back()}
          />
          <Text strong>{t('submission.title')}</Text>
        </div>
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Empty description={error || t('submission.notFound')} />
          <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />} style={{ marginTop: 16 }}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  const passedCount = submission.testResults?.filter(r => r.passed).length || 0
  const totalCount = submission.testResults?.length || 0
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
  const monacoLanguage = LANGUAGE_MAP[submission.language] || 'plaintext'

  const collapseItems = submission.testResults?.map((result, index) => ({
    key: String(index),
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        {result.passed
          ? <CheckCircleFilled style={{ color: '#52c41a' }} />
          : <CloseCircleFilled style={{ color: '#ff4d4f' }} />
        }
        <span>{t('problemDetail.testCase')} #{index + 1}</span>
        {result.executionTime !== undefined && result.executionTime > 0 && (
          <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontSize: 11 }}>
            {result.executionTime}ms
          </Tag>
        )}
      </div>
    ),
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <Text type="secondary" strong style={{ fontSize: 12 }}>{t('problemDetail.input')}:</Text>
          <pre style={{
            background: '#f5f5f5', borderRadius: 8, padding: 10,
            marginTop: 4, fontSize: 12, fontFamily: 'monospace', overflow: 'auto',
          }}>
            {result.input}
          </pre>
        </div>
        <div>
          <Text type="secondary" strong style={{ fontSize: 12 }}>{t('problemDetail.expectedOutput')}:</Text>
          <pre style={{
            background: '#f5f5f5', borderRadius: 8, padding: 10,
            marginTop: 4, fontSize: 12, fontFamily: 'monospace', overflow: 'auto',
          }}>
            {result.expectedOutput}
          </pre>
        </div>
        {result.actualOutput !== undefined && (
          <div>
            <Text type="secondary" strong style={{ fontSize: 12 }}>{t('problemDetail.yourOutput')}:</Text>
            <pre style={{
              background: result.passed ? '#f6ffed' : '#fff2f0',
              borderRadius: 8, padding: 10, marginTop: 4,
              fontSize: 12, fontFamily: 'monospace', overflow: 'auto',
            }}>
              {result.actualOutput}
            </pre>
          </div>
        )}
        {result.error && (
          <div>
            <Text type="danger" strong style={{ fontSize: 12 }}>{t('common.error')}:</Text>
            <pre style={{
              background: '#fff2f0', borderRadius: 8, padding: 10,
              marginTop: 4, fontSize: 12, fontFamily: 'monospace',
              overflow: 'auto', color: '#ff4d4f',
            }}>
              {result.error}
            </pre>
          </div>
        )}
      </div>
    ),
  })) || []

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
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
          onClick={() => router.back()}
          style={{ padding: '4px 8px' }}
        />
        <Text strong style={{ fontSize: 15, flex: 1 }}>
          {t('submission.title')} #{submission.id}
        </Text>
        <Tag color={getStatusColor(submission.status)} style={{ margin: 0 }}>
          {getStatusText(submission.status)}
        </Tag>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ padding: 16 }}
      >
        {/* Status card */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {getStatusIcon(submission.status)}
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {getStatusText(submission.status)}
              </Text>
              {problem && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{problem.title}</Text>
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: 10, background: '#f6ffed', borderRadius: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{passedCount}/{totalCount}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{t('submission.passed')}</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: '#f0f5ff', borderRadius: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4f46e5' }}>{submission.score}%</div>
              <div style={{ fontSize: 11, color: '#999' }}>{t('history.score')}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <Text type="secondary">
              <CodeOutlined /> {submission.language}
            </Text>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {submission.submittedAt ? format(new Date(submission.submittedAt), 'yyyy-MM-dd HH:mm') : '-'}
            </Text>
          </div>
        </Card>

        {/* Pass rate */}
        <Card style={{ borderRadius: 12, marginBottom: 12 }} styles={{ body: { padding: 16, textAlign: 'center' } }}>
          <Progress
            type="circle"
            percent={passRate}
            size={80}
            strokeColor={submission.status === 'Accepted' ? '#52c41a' : '#ff4d4f'}
            format={() => (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{passRate}%</div>
              </div>
            )}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('submission.passRate')}</Text>
          </div>
        </Card>

        {/* Source Code */}
        <Card
          style={{ borderRadius: 12, marginBottom: 12 }}
          styles={{ body: { padding: 0 } }}
          title={
            <Space style={{ fontSize: 14 }}>
              <CodeOutlined />
              {t('submission.sourceCode')}
            </Space>
          }
          extra={<Tag style={{ margin: 0 }}>{submission.language}</Tag>}
        >
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <Editor
              height="280px"
              language={monacoLanguage}
              value={submission.code}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 12,
                fontFamily: "'Fira Code', Menlo, Monaco, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: false,
                padding: { top: 8, bottom: 8 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>
        </Card>

        {/* Test Results */}
        {collapseItems.length > 0 && (
          <Card
            style={{ borderRadius: 12 }}
            title={
              <Space style={{ fontSize: 14 }}>
                {t('problemDetail.testResults')}
                <Tag color={submission.status === 'Accepted' ? 'green' : 'red'}>
                  {passedCount}/{totalCount}
                </Tag>
              </Space>
            }
          >
            <Collapse
              items={collapseItems}
              defaultActiveKey={
                submission.testResults
                  ?.map((r, i) => ({ ...r, index: i }))
                  .filter(r => !r.passed)
                  .slice(0, 1)
                  .map(r => String(r.index)) || []
              }
              size="small"
            />
          </Card>
        )}
      </motion.div>
    </div>
  )
}
