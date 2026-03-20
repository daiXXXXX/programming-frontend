'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Card, Typography, Tag, Spin, Button, Descriptions, Progress, Collapse, Empty, 
  Space, Tooltip 
} from 'antd'
import { 
  CheckCircleFilled, CloseCircleFilled, ArrowLeftOutlined, 
  ClockCircleOutlined, CodeOutlined 
} from '@ant-design/icons'
import { Code, ArrowLeft } from '@phosphor-icons/react'
import Link from 'next/link'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { api, Submission, Problem, SubmissionStatus } from '@/lib/api'
import { useI18n } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import Editor from '@monaco-editor/react'

const { Title, Text, Paragraph } = Typography

// 语言名称 → Monaco 语言标识映射
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
      return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
    default:
      return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
  }
}

export default function SubmissionDetailPage() {
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
        // 获取关联的题目信息
        try {
          const prob = await api.getProblem(sub.problemId)
          setProblem(prob)
        } catch {
          // 题目可能已被删除，不影响展示提交详情
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/workspace" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Code size={32} weight="duotone" className="text-indigo-600" />
                <div>
                  <Title level={4} style={{ margin: 0 }}>{t('header.title')}</Title>
                  <Text type="secondary">{t('header.subtitle')}</Text>
                </div>
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <Empty description={error || t('submission.notFound')} />
          <div className="text-center mt-4">
            <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>
              {t('common.back')}
            </Button>
          </div>
        </main>
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
      <div className="flex items-center gap-3">
        {result.passed 
          ? <CheckCircleFilled style={{ color: '#52c41a' }} /> 
          : <CloseCircleFilled style={{ color: '#ff4d4f' }} />
        }
        <span>{t('problemDetail.testCase')} #{index + 1}</span>
        {result.executionTime !== undefined && result.executionTime > 0 && (
          <Tag icon={<ClockCircleOutlined />} color="default">
            {result.executionTime}ms
          </Tag>
        )}
        <Tag color={result.passed ? 'green' : 'red'}>
          {result.passed ? t('problemDetail.passed') : t('problemDetail.failed')}
        </Tag>
      </div>
    ),
    children: (
      <div className="space-y-3">
        <div>
          <Text type="secondary" strong>{t('problemDetail.input')}:</Text>
          <pre className="bg-gray-100 rounded-lg p-3 mt-1 text-sm font-mono overflow-x-auto">
            {result.input}
          </pre>
        </div>
        <div>
          <Text type="secondary" strong>{t('problemDetail.expectedOutput')}:</Text>
          <pre className="bg-gray-100 rounded-lg p-3 mt-1 text-sm font-mono overflow-x-auto">
            {result.expectedOutput}
          </pre>
        </div>
        {result.actualOutput !== undefined && (
          <div>
            <Text type="secondary" strong>{t('problemDetail.yourOutput')}:</Text>
            <pre className={`rounded-lg p-3 mt-1 text-sm font-mono overflow-x-auto ${
              result.passed ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {result.actualOutput}
            </pre>
          </div>
        )}
        {result.error && (
          <div>
            <Text type="danger" strong>{t('common.error')}:</Text>
            <pre className="bg-red-50 rounded-lg p-3 mt-1 text-sm font-mono overflow-x-auto text-red-600">
              {result.error}
            </pre>
          </div>
        )}
      </div>
    ),
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/workspace" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Code size={32} weight="duotone" className="text-indigo-600" />
              <div>
                <Title level={4} style={{ margin: 0 }}>{t('header.title')}</Title>
                <Text type="secondary">{t('header.subtitle')}</Text>
              </div>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Back Button */}
          <Button 
            type="text" 
            icon={<ArrowLeft size={18} />}
            onClick={() => router.back()}
            className="mb-4 text-gray-600 hover:text-indigo-600"
          >
            {t('common.back')}
          </Button>

          {/* Title & Status Overview */}
          <Card className="mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(submission.status)}
                  <Title level={3} style={{ margin: 0 }}>
                    {t('submission.title')} #{submission.id}
                  </Title>
                </div>
                {problem && (
                  <Link href="/workspace" className="text-indigo-600 hover:underline">
                    <Text className="text-indigo-600">{problem.title}</Text>
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Tag 
                  color={getStatusColor(submission.status)} 
                  style={{ fontSize: 14, padding: '4px 12px' }}
                >
                  {getStatusText(submission.status)}
                </Tag>
              </div>
            </div>

            <div className="mt-6">
              <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
                <Descriptions.Item label={t('history.score')}>
                  <Text strong style={{ fontSize: 16 }}>{submission.score}%</Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('history.language')}>
                  <Tag icon={<CodeOutlined />}>{submission.language}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('submission.passRate')}>
                  <Text strong>{passedCount}/{totalCount}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('history.submittedAt')}>
                  <Text type="secondary">
                    {submission.submittedAt ? format(new Date(submission.submittedAt), 'yyyy-MM-dd HH:mm:ss') : '-'}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          </Card>

          {/* Pass Rate Progress */}
          <Card className="mb-6" title={t('submission.testOverview')}>
            <div className="flex items-center gap-6">
              <Progress 
                type="circle" 
                percent={passRate}
                size={100}
                strokeColor={submission.status === 'Accepted' ? '#52c41a' : '#ff4d4f'}
                format={() => (
                  <div className="text-center">
                    <div className="text-lg font-bold">{passedCount}/{totalCount}</div>
                    <div className="text-xs text-gray-500">{t('submission.passed')}</div>
                  </div>
                )}
              />
              <div className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                    <div className="text-xs text-gray-500">{t('problemDetail.passed')}</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{totalCount - passedCount}</div>
                    <div className="text-xs text-gray-500">{t('problemDetail.failed')}</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{passRate}%</div>
                    <div className="text-xs text-gray-500">{t('submission.passRate')}</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{submission.score}%</div>
                    <div className="text-xs text-gray-500">{t('history.score')}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Source Code */}
          <Card 
            className="mb-6" 
            title={
              <Space>
                <CodeOutlined />
                {t('submission.sourceCode')}
              </Space>
            }
            extra={<Tag>{submission.language}</Tag>}
          >
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
              <Editor
                height="400px"
                language={monacoLanguage}
                value={submission.code}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  folding: true,
                  bracketPairColorization: { enabled: true },
                  padding: { top: 12, bottom: 12 },
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                }}
              />
            </div>
          </Card>

          {/* Test Results */}
          {collapseItems.length > 0 && (
            <Card 
              title={
                <Space>
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
                  // 默认展开第一个失败的测试用例
                  submission.testResults
                    ?.map((r, i) => ({ ...r, index: i }))
                    .filter(r => !r.passed)
                    .slice(0, 1)
                    .map(r => String(r.index)) || []
                }
              />
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  )
}
