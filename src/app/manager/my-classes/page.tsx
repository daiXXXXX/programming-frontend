'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Typography,
  Card,
  Input,
  Table,
  Tag,
  Spin,
  Empty,
  Progress,
  Collapse,
  Avatar,
  Statistic,
  Row,
  Col,
  Tooltip,
  Button,
  Select,
  Switch,
  InputNumber,
  Space,
  Alert,
  List,
  Divider,
  Modal,
  message,
} from 'antd'
import {
  SearchOutlined,
  TeamOutlined,
  BookOutlined,
  UserOutlined,
  ExperimentOutlined,
  RobotOutlined,
  FlagOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { useAuth, useI18n } from '@/hooks'
import {
  api,
  ClassDetailData,
  ClassInfo,
  PlagiarismCheckResponse,
  PlagiarismPairResult,
  StudentProgress,
} from '@/lib/api'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography
const { Search } = Input

const DEFAULT_PLAGIARISM_FORM = {
  problemId: undefined as number | undefined,
  acceptedOnly: false,
  maxCandidates: 5,
  minHeuristicScore: 0.55,
}

function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'high':
      return 'red'
    case 'medium':
      return 'orange'
    case 'low':
      return 'green'
    default:
      return 'default'
  }
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'likely_plagiarism':
      return 'red'
    case 'suspicious':
      return 'gold'
    case 'unlikely':
      return 'green'
    default:
      return 'default'
  }
}

function formatSimilarity(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getSelectionLabel(selection: string, t: (key: string) => string): string {
  switch (selection) {
    case 'latest_accepted':
      return t('manager.selectionLatestAccepted')
    case 'latest_submission':
      return t('manager.selectionLatestSubmission')
    case 'manual_review':
      return t('manager.selectionManualReview')
    default:
      return selection || '-'
  }
}

function ensureTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags : [...tags, tag]
}

export default function MyClassesPage() {
  const { t } = useI18n()
  const { isAdmin } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [classDetail, setClassDetail] = useState<ClassDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [plagiarismLoading, setPlagiarismLoading] = useState(false)
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismCheckResponse | null>(null)
  const [markingPairKey, setMarkingPairKey] = useState<string | null>(null)
  const [plagiarismForm, setPlagiarismForm] = useState(DEFAULT_PLAGIARISM_FORM)

  // 获取班级列表。
  const fetchClasses = useCallback(async (keyword?: string) => {
    setLoading(true)
    try {
      const data = await api.getManagerClasses(keyword, isAdmin)
      setClasses(data)
    } catch (err) {
      console.error('Failed to fetch classes:', err)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  // 获取班级详情，同时刷新查重默认参数。
  const fetchClassDetail = useCallback(async (classId: number) => {
    setDetailLoading(true)
    try {
      const data = await api.getManagerClassDetail(classId)
      setClassDetail(data)
      setPlagiarismReport(null)
      setPlagiarismForm((prev) => ({
        ...DEFAULT_PLAGIARISM_FORM,
        ...prev,
        problemId: data.problems.find((item) => item.id === prev.problemId)?.id ?? data.problems[0]?.id,
      }))
    } catch (err) {
      console.error('Failed to fetch class detail:', err)
      setClassDetail(null)
      setPlagiarismReport(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // 搜索班级。
  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    fetchClasses(value.trim() || undefined)
  }

  // 切换班级时同步清空上一班级的查重结果。
  const handleSelectClass = (classId: number) => {
    if (selectedClassId === classId) {
      setSelectedClassId(null)
      setClassDetail(null)
      setPlagiarismReport(null)
      setPlagiarismForm(DEFAULT_PLAGIARISM_FORM)
    } else {
      setSelectedClassId(classId)
      fetchClassDetail(classId)
    }
  }

  // 主动触发 AI 查重，只在教师点击后调用后端接口。
  const handleRunPlagiarismCheck = async () => {
    if (!selectedClassId || !plagiarismForm.problemId) {
      message.warning(t('manager.plagiarismPickProblem'))
      return
    }

    setPlagiarismLoading(true)
    try {
      const report = await api.runClassPlagiarismCheck(selectedClassId, {
        problemId: plagiarismForm.problemId,
        acceptedOnly: plagiarismForm.acceptedOnly,
        maxCandidates: plagiarismForm.maxCandidates,
        minHeuristicScore: plagiarismForm.minHeuristicScore,
      })
      setPlagiarismReport(report)
      message.success(t('manager.plagiarismRunSuccess'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('manager.plagiarismRunFailed'))
    } finally {
      setPlagiarismLoading(false)
    }
  }

  // 教师人工确认后，把这对提交都打上“作弊”标签。
  const handleMarkPair = (pair: PlagiarismPairResult) => {
    if (!selectedClassId || !plagiarismForm.problemId) {
      return
    }

    Modal.confirm({
      title: t('manager.plagiarismConfirmTitle'),
      content: t('manager.plagiarismConfirmContent'),
      okText: t('manager.plagiarismMarkCheating'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setMarkingPairKey(pair.pairKey)
          const result = await api.markClassPlagiarismPair(selectedClassId, {
            problemId: plagiarismForm.problemId,
            submissionAId: pair.submissionA.id,
            submissionBId: pair.submissionB.id,
          })

          setPlagiarismReport((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              results: prev.results.map((item) => {
                if (item.pairKey !== pair.pairKey) {
                  return item
                }

                return {
                  ...item,
                  alreadyMarked: true,
                  submissionA: {
                    ...item.submissionA,
                    tags: ensureTag(result.submissionA.tags || item.submissionA.tags || [], result.tag),
                    markedCheating: true,
                  },
                  submissionB: {
                    ...item.submissionB,
                    tags: ensureTag(result.submissionB.tags || item.submissionB.tags || [], result.tag),
                    markedCheating: true,
                  },
                }
              }),
            }
          })
          message.success(t('manager.plagiarismMarkSuccess'))
        } catch (err) {
          message.error(err instanceof Error ? err.message : t('manager.plagiarismMarkFailed'))
        } finally {
          setMarkingPairKey(null)
        }
      },
    })
  }

  const studentColumns: ColumnsType<StudentProgress> = [
    {
      title: t('manager.studentName'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: StudentProgress) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar
            size="small"
            src={record.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${text}`}
            icon={<UserOutlined />}
          />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: t('manager.completionProgress'),
      key: 'progress',
      render: (_: unknown, record: StudentProgress) => {
        const percent = record.totalProblems > 0
          ? Math.round((record.solvedProblems / record.totalProblems) * 100)
          : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
            <Progress
              percent={percent}
              size="small"
              style={{ flex: 1, marginBottom: 0 }}
              strokeColor={percent === 100 ? '#52c41a' : '#4f46e5'}
            />
            <Text type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
              {record.solvedProblems}/{record.totalProblems}
            </Text>
          </div>
        )
      },
      sorter: (a: StudentProgress, b: StudentProgress) => {
        const ap = a.totalProblems > 0 ? a.solvedProblems / a.totalProblems : 0
        const bp = b.totalProblems > 0 ? b.solvedProblems / b.totalProblems : 0
        return ap - bp
      },
    },
    {
      title: t('manager.totalSubmissions'),
      dataIndex: 'totalSubmissions',
      key: 'totalSubmissions',
      sorter: (a: StudentProgress, b: StudentProgress) => a.totalSubmissions - b.totalSubmissions,
      render: (value: number) => <span>{value}</span>,
    },
    {
      title: t('manager.acceptedSubmissions'),
      dataIndex: 'acceptedSubmissions',
      key: 'acceptedSubmissions',
      sorter: (a: StudentProgress, b: StudentProgress) => a.acceptedSubmissions - b.acceptedSubmissions,
      render: (value: number) => <Tag color="green">{value}</Tag>,
    },
    {
      title: t('manager.successRate'),
      key: 'successRate',
      render: (_: unknown, record: StudentProgress) => {
        const rate = record.totalSubmissions > 0
          ? Math.round((record.acceptedSubmissions / record.totalSubmissions) * 100)
          : 0
        return (
          <Tag color={rate >= 80 ? 'green' : rate >= 50 ? 'orange' : 'red'}>
            {rate}%
          </Tag>
        )
      },
      sorter: (a: StudentProgress, b: StudentProgress) => {
        const ar = a.totalSubmissions > 0 ? a.acceptedSubmissions / a.totalSubmissions : 0
        const br = b.totalSubmissions > 0 ? b.acceptedSubmissions / b.totalSubmissions : 0
        return ar - br
      },
    },
    {
      title: t('manager.lastSubmission'),
      dataIndex: 'lastSubmissionAt',
      key: 'lastSubmissionAt',
      render: (value: string | null) => {
        if (!value) return <Text type="secondary">-</Text>
        const date = new Date(value)
        return (
          <Tooltip title={date.toLocaleString()}>
            <Text type="secondary">{date.toLocaleDateString()}</Text>
          </Tooltip>
        )
      },
      sorter: (a: StudentProgress, b: StudentProgress) => {
        if (!a.lastSubmissionAt && !b.lastSubmissionAt) return 0
        if (!a.lastSubmissionAt) return -1
        if (!b.lastSubmissionAt) return 1
        return new Date(a.lastSubmissionAt).getTime() - new Date(b.lastSubmissionAt).getTime()
      },
    },
  ]

  const renderPairSection = (title: string, items: string[]) => {
    if (items.length === 0) return null

    return (
      <div style={{ marginTop: 12 }}>
        <Text strong>{title}</Text>
        <ul style={{ margin: '8px 0 0 18px', color: '#595959' }}>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      {/* 全局页头。 */}
      {/* 页头 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          <TeamOutlined style={{ marginRight: 8, color: '#4f46e5' }} />
          {t('manager.myClasses')}
        </Title>
        <Text type="secondary">
          {isAdmin ? t('manager.allClassesDesc') : t('manager.myClassesDesc')}
        </Text>
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder={t('manager.searchClass')}
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onSearch={handleSearch}
          style={{ maxWidth: 480 }}
        />
      </div>

      {/* 班级列表 */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : classes.length === 0 ? (
        <Empty description={t('manager.noClasses')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {classes.map((cls) => (
            <Card
              key={cls.id}
              hoverable
              style={{
                borderColor: selectedClassId === cls.id ? '#4f46e5' : undefined,
                borderWidth: selectedClassId === cls.id ? 2 : 1,
                transition: 'all 0.3s',
              }}
              onClick={() => handleSelectClass(cls.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Title level={4} style={{ margin: 0 }}>{cls.name}</Title>
                    <Tag color="blue">{cls.studentCount} {t('manager.students')}</Tag>
                    <Tag color="purple">{cls.experimentCount} {t('manager.experiments')}</Tag>
                  </div>
                  {cls.description && (
                    <Text type="secondary">{cls.description}</Text>
                  )}
                </div>
              </div>

              {/* 展开的详情 */}
              {selectedClassId === cls.id && (
                <div style={{ marginTop: 24 }} onClick={(e) => e.stopPropagation()}>
                  {detailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <Spin />
                    </div>
                  ) : classDetail ? (
                    <div>
                      {/* 统计卡片 */}
                      <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={6}>
                          <Card size="small" style={{ textAlign: 'center', background: '#f0f5ff' }}>
                            <Statistic
                              title={t('manager.totalStudents')}
                              value={classDetail.students.length}
                              prefix={<TeamOutlined />}
                              valueStyle={{ color: '#4f46e5' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
                            <Statistic
                              title={t('manager.totalExperiments')}
                              value={classDetail.experiments.length}
                              prefix={<ExperimentOutlined />}
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
                            <Statistic
                              title={t('manager.avgCompletion')}
                              value={(() => {
                                if (classDetail.students.length === 0) return 0
                                const avg = classDetail.students.reduce((sum, s) => {
                                  return sum + (s.totalProblems > 0 ? (s.solvedProblems / s.totalProblems) * 100 : 0)
                                }, 0) / classDetail.students.length
                                return Math.round(avg)
                              })()}
                              suffix="%"
                              valueStyle={{ color: '#fa8c16' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small" style={{ textAlign: 'center', background: '#fff1f0' }}>
                            <Statistic
                              title={t('manager.avgSuccessRate')}
                              value={(() => {
                                if (classDetail.students.length === 0) return 0
                                const avg = classDetail.students.reduce((sum, s) => {
                                  return sum + (s.totalSubmissions > 0 ? (s.acceptedSubmissions / s.totalSubmissions) * 100 : 0)
                                }, 0) / classDetail.students.length
                                return Math.round(avg)
                              })()}
                              suffix="%"
                              valueStyle={{ color: '#f5222d' }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      {/* 实验列表 */}
                      <Collapse
                        style={{ marginBottom: 24 }}
                        items={classDetail.experiments.map((exp) => ({
                          key: exp.id,
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <BookOutlined />
                              <span style={{ fontWeight: 500 }}>{exp.title}</span>
                              <Tag color={exp.isActive ? 'green' : 'default'}>
                                {exp.isActive ? t('manager.active') : t('manager.inactive')}
                              </Tag>
                              <Tag>{exp.problemCount} {t('manager.problems')}</Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(exp.startTime).toLocaleDateString()} - {new Date(exp.endTime).toLocaleDateString()}
                              </Text>
                            </div>
                          ),
                          children: (
                            <div>
                              <Text type="secondary">{exp.description}</Text>
                            </div>
                          ),
                        }))}
                      />

                      {/* 查重面板：教师手动选择题目并触发。 */}
                      <Card
                        style={{ marginBottom: 24, borderColor: '#d6e4ff', background: '#f8faff' }}
                        title={
                          <Space>
                            <RobotOutlined style={{ color: '#4f46e5' }} />
                            <span>{t('manager.plagiarismTitle')}</span>
                          </Space>
                        }
                      >
                        {classDetail.problems.length === 0 ? (
                          <Empty description={t('manager.plagiarismNoProblems')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                          <>
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={10}>
                                <Text strong>{t('manager.plagiarismProblem')}</Text>
                                <Select
                                  style={{ width: '100%', marginTop: 8 }}
                                  value={plagiarismForm.problemId}
                                  placeholder={t('manager.plagiarismPickProblem')}
                                  onChange={(value) => setPlagiarismForm((prev) => ({ ...prev, problemId: value }))}
                                  options={classDetail.problems.map((problem) => ({
                                    value: problem.id,
                                    label: `${problem.title} · ${problem.difficulty}`,
                                  }))}
                                />
                              </Col>
                              <Col xs={24} sm={12} md={5}>
                                <Text strong>{t('manager.plagiarismMaxCandidates')}</Text>
                                <InputNumber
                                  min={1}
                                  max={10}
                                  style={{ width: '100%', marginTop: 8 }}
                                  value={plagiarismForm.maxCandidates}
                                  onChange={(value) => setPlagiarismForm((prev) => ({
                                    ...prev,
                                    maxCandidates: Number(value) || DEFAULT_PLAGIARISM_FORM.maxCandidates,
                                  }))}
                                />
                              </Col>
                              <Col xs={24} sm={12} md={5}>
                                <Text strong>{t('manager.plagiarismThreshold')}</Text>
                                <InputNumber
                                  min={0.1}
                                  max={0.95}
                                  step={0.05}
                                  style={{ width: '100%', marginTop: 8 }}
                                  value={plagiarismForm.minHeuristicScore}
                                  onChange={(value) => setPlagiarismForm((prev) => ({
                                    ...prev,
                                    minHeuristicScore: Number(value) || DEFAULT_PLAGIARISM_FORM.minHeuristicScore,
                                  }))}
                                />
                              </Col>
                              <Col xs={24} md={4}>
                                <Text strong>{t('manager.plagiarismAcceptedOnly')}</Text>
                                <div style={{ marginTop: 14 }}>
                                  <Switch
                                    checked={plagiarismForm.acceptedOnly}
                                    onChange={(checked) => setPlagiarismForm((prev) => ({ ...prev, acceptedOnly: checked }))}
                                  />
                                </div>
                              </Col>
                            </Row>

                            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                              <Text type="secondary">
                                {t('manager.plagiarismHint')}
                              </Text>
                              <Button
                                type="primary"
                                icon={<RobotOutlined />}
                                loading={plagiarismLoading}
                                onClick={handleRunPlagiarismCheck}
                              >
                                {t('manager.plagiarismRun')}
                              </Button>
                            </div>

                            {plagiarismReport && (
                              <div style={{ marginTop: 20 }}>
                                <Alert
                                  type={plagiarismReport.results.length > 0 ? 'warning' : 'info'}
                                  showIcon
                                  message={plagiarismReport.problemTitle || t('manager.plagiarismTitle')}
                                  description={plagiarismReport.overallSummary || t('manager.plagiarismNoCandidates')}
                                  style={{ marginBottom: 16 }}
                                />

                                <Row gutter={16} style={{ marginBottom: 16 }}>
                                  <Col xs={24} sm={8}>
                                    <Card size="small">
                                      <Statistic title={t('manager.plagiarismComparedStudents')} value={plagiarismReport.comparedStudents} />
                                    </Card>
                                  </Col>
                                  <Col xs={24} sm={8}>
                                    <Card size="small">
                                      <Statistic title={t('manager.plagiarismCandidatePairs')} value={plagiarismReport.candidatePairs} />
                                    </Card>
                                  </Col>
                                  <Col xs={24} sm={8}>
                                    <Card size="small">
                                      <Statistic title={t('manager.plagiarismResultCount')} value={plagiarismReport.results.length} />
                                    </Card>
                                  </Col>
                                </Row>

                                {plagiarismReport.results.length === 0 ? (
                                  <Empty description={t('manager.plagiarismNoCandidates')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                ) : (
                                  <List
                                    dataSource={plagiarismReport.results}
                                    split
                                    renderItem={(pair) => (
                                      <List.Item style={{ display: 'block', paddingInline: 0 }}>
                                        <Card size="small" style={{ borderColor: pair.alreadyMarked ? '#ffd666' : undefined }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                                            <div>
                                              <Space wrap>
                                                <Tag color={getVerdictColor(pair.verdict)}>{pair.verdict}</Tag>
                                                <Tag color={getRiskColor(pair.riskLevel)}>{pair.riskLevel}</Tag>
                                                <Tag>{t('manager.plagiarismHeuristicScore')}: {formatSimilarity(pair.heuristicScore)}</Tag>
                                                <Tag>{t('manager.plagiarismAIConfidence')}: {formatSimilarity(pair.aiConfidence)}</Tag>
                                                {pair.alreadyMarked && (
                                                  <Tag color="red">{t('manager.plagiarismAlreadyMarked')}</Tag>
                                                )}
                                              </Space>
                                              <Title level={5} style={{ margin: '12px 0 8px' }}>
                                                {pair.studentA.username} ↔ {pair.studentB.username}
                                              </Title>
                                              <Text type="secondary">{pair.summary}</Text>
                                            </div>

                                            <Space wrap>
                                              <Link href={`/submission/${pair.submissionA.id}`}>
                                                <Button icon={<CodeOutlined />}>{t('manager.plagiarismViewSubmissionA')}</Button>
                                              </Link>
                                              <Link href={`/submission/${pair.submissionB.id}`}>
                                                <Button icon={<CodeOutlined />}>{t('manager.plagiarismViewSubmissionB')}</Button>
                                              </Link>
                                              <Button
                                                danger
                                                type={pair.alreadyMarked ? 'default' : 'primary'}
                                                icon={<FlagOutlined />}
                                                loading={markingPairKey === pair.pairKey}
                                                disabled={pair.alreadyMarked}
                                                onClick={() => handleMarkPair(pair)}
                                              >
                                                {t('manager.plagiarismMarkCheating')}
                                              </Button>
                                            </Space>
                                          </div>

                                          <Divider style={{ margin: '16px 0' }} />

                                          <Row gutter={[16, 16]}>
                                            <Col xs={24} md={12}>
                                              <Card size="small" title={pair.studentA.username}>
                                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                  <Text>{t('manager.plagiarismSubmissionId')}: {pair.submissionA.id}</Text>
                                                  <Text>{t('manager.plagiarismLanguage')}: {pair.submissionA.language || '-'}</Text>
                                                  <Text>{t('manager.plagiarismStatus')}: {pair.submissionA.status}</Text>
                                                  <Text>{t('manager.plagiarismSelection')}: {getSelectionLabel(pair.submissionA.selection, t)}</Text>
                                                  <Text>{t('manager.plagiarismSubmittedAt')}: {new Date(pair.submissionA.submittedAt).toLocaleString()}</Text>
                                                  <Space wrap>
                                                    {(pair.submissionA.tags || []).length > 0 ? pair.submissionA.tags.map((tag) => (
                                                      <Tag key={`a-${pair.pairKey}-${tag}`} color={tag === '作弊' ? 'red' : 'default'}>{tag}</Tag>
                                                    )) : <Text type="secondary">{t('manager.plagiarismNoTags')}</Text>}
                                                  </Space>
                                                </Space>
                                              </Card>
                                            </Col>
                                            <Col xs={24} md={12}>
                                              <Card size="small" title={pair.studentB.username}>
                                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                  <Text>{t('manager.plagiarismSubmissionId')}: {pair.submissionB.id}</Text>
                                                  <Text>{t('manager.plagiarismLanguage')}: {pair.submissionB.language || '-'}</Text>
                                                  <Text>{t('manager.plagiarismStatus')}: {pair.submissionB.status}</Text>
                                                  <Text>{t('manager.plagiarismSelection')}: {getSelectionLabel(pair.submissionB.selection, t)}</Text>
                                                  <Text>{t('manager.plagiarismSubmittedAt')}: {new Date(pair.submissionB.submittedAt).toLocaleString()}</Text>
                                                  <Space wrap>
                                                    {(pair.submissionB.tags || []).length > 0 ? pair.submissionB.tags.map((tag) => (
                                                      <Tag key={`b-${pair.pairKey}-${tag}`} color={tag === '作弊' ? 'red' : 'default'}>{tag}</Tag>
                                                    )) : <Text type="secondary">{t('manager.plagiarismNoTags')}</Text>}
                                                  </Space>
                                                </Space>
                                              </Card>
                                            </Col>
                                          </Row>

                                          {renderPairSection(t('manager.plagiarismEvidence'), pair.evidence || [])}
                                          {renderPairSection(t('manager.plagiarismDifferences'), pair.differences || [])}
                                        </Card>
                                      </List.Item>
                                    )}
                                  />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </Card>

                      {/* 学生进度表 */}
                      <Title level={5} style={{ marginBottom: 16 }}>
                        <TeamOutlined style={{ marginRight: 8 }} />
                        {t('manager.studentProgress')}
                      </Title>
                      <Table
                        columns={studentColumns}
                        dataSource={classDetail.students}
                        rowKey="userId"
                        size="middle"
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showTotal: (total) => `${t('manager.total')} ${total} ${t('manager.students')}`,
                        }}
                      />
                    </div>
                  ) : (
                    <Empty description={t('manager.loadError')} />
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
