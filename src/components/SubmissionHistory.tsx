'use client'

import { Problem, Submission } from '@/lib/api'
import { Card, Table, Tag, Button, Empty, Typography } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, CodeOutlined } from '@ant-design/icons'
import { format } from 'date-fns'
import { useI18n } from '@/hooks/use-i18n'
import type { ColumnsType } from 'antd/es/table'

const { Text, Title } = Typography

interface SubmissionHistoryProps {
  submissions: Submission[]
  problems: Problem[]
  onViewProblem: (problem: Problem) => void
}

export function SubmissionHistory({ submissions, problems, onViewProblem }: SubmissionHistoryProps) {
  const { t } = useI18n()
  
  if (submissions.length === 0) {
    return (
      <Card>
        <Empty
          image={<CodeOutlined style={{ fontSize: 48, color: '#999' }} />}
          description={
            <div>
              <Title level={5}>{t('history.noSubmissions')}</Title>
              <Text type="secondary">{t('dashboard.noActivity')}</Text>
            </div>
          }
        />
      </Card>
    )
  }

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )

  const getStatusIcon = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return <CheckCircleFilled style={{ color: '#52c41a' }} />
      default:
        return <CloseCircleFilled style={{ color: '#ff4d4f' }} />
    }
  }

  const getStatusColor = (status: Submission['status']): string => {
    switch (status) {
      case 'Accepted':
        return 'green'
      case 'Wrong Answer':
        return 'red'
      case 'Runtime Error':
        return 'orange'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: Submission['status']) => {
    switch (status) {
      case 'Accepted':
        return t('status.accepted')
      case 'Wrong Answer':
        return t('status.wrongAnswer')
      case 'Runtime Error':
        return t('status.runtimeError')
      default:
        return t('status.pending')
    }
  }

  interface TableRecord extends Submission {
    problem?: Problem
  }

  const columns: ColumnsType<TableRecord> = [
    {
      title: t('history.problem'),
      dataIndex: 'problemId',
      key: 'problem',
      render: (_, record) => <Text strong>{record.problem?.title || '-'}</Text>,
    },
    {
      title: t('history.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: Submission['status']) => (
        <span className="flex items-center gap-2">
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
        </span>
      ),
    },
    {
      title: t('history.score'),
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => <Text strong>{score}%</Text>,
    },
    {
      title: t('history.language'),
      dataIndex: 'language',
      key: 'language',
      render: (language: string) => <Tag>{language}</Tag>,
    },
    {
      title: t('history.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (submittedAt: string) => (
        <Text type="secondary">{format(new Date(submittedAt), 'MMM d, yyyy HH:mm')}</Text>
      ),
    },
    {
      title: t('history.view'),
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => record.problem && onViewProblem(record.problem)}
        >
          {t('history.view')}
        </Button>
      ),
    },
  ]

  const dataSource: TableRecord[] = sortedSubmissions.map(submission => ({
    ...submission,
    key: submission.id,
    problem: problems.find(p => p.id === submission.problemId),
  })).filter(item => item.problem)

  return (
    <Card>
      <Table 
        columns={columns} 
        dataSource={dataSource}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  )
}
