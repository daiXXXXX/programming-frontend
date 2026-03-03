'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Card,
  Input,
  Table,
  Tag,
  Space,
  Spin,
  Empty,
  Badge,
  Progress,
  Collapse,
  Avatar,
  Statistic,
  Row,
  Col,
  Tooltip,
} from 'antd'
import {
  SearchOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import { useAuth, useI18n } from '@/hooks'
import { api } from '@/lib/api'

const { Title, Text } = Typography
const { Search } = Input

// 类型定义
interface ClassInfo {
  id: number
  name: string
  description: string
  teacherId: number
  teacherName: string
  studentCount: number
  experimentCount: number
  createdAt: string
}

interface ExperimentInfo {
  id: number
  title: string
  description: string
  startTime: string
  endTime: string
  isActive: boolean
  problemCount: number
}

interface StudentProgress {
  userId: number
  username: string
  avatar: string
  totalProblems: number
  solvedProblems: number
  totalSubmissions: number
  acceptedSubmissions: number
  lastSubmissionAt: string | null
}

interface ClassDetailData {
  classInfo: ClassInfo
  experiments: ExperimentInfo[]
  students: StudentProgress[]
}

export default function MyClassesPage() {
  const { t } = useI18n()
  const { user, isAdmin } = useAuth()
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [classDetail, setClassDetail] = useState<ClassDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 获取班级列表
  const fetchClasses = useCallback(async (keyword?: string) => {
    setLoading(true)
    try {
      const query = keyword ? `?search=${encodeURIComponent(keyword)}` : ''
      const endpoint = isAdmin ? `/manager/classes${query}` : `/manager/my-classes${query}`
      const data = await api.request<ClassInfo[]>(endpoint)
      setClasses(data)
    } catch (err) {
      console.error('Failed to fetch classes:', err)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  // 获取班级详情
  const fetchClassDetail = useCallback(async (classId: number) => {
    setDetailLoading(true)
    try {
      const data = await api.request<ClassDetailData>(`/manager/classes/${classId}`)
      setClassDetail(data)
    } catch (err) {
      console.error('Failed to fetch class detail:', err)
      setClassDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  // 搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    fetchClasses(value.trim() || undefined)
  }

  // 选中班级
  const handleSelectClass = (classId: number) => {
    if (selectedClassId === classId) {
      setSelectedClassId(null)
      setClassDetail(null)
    } else {
      setSelectedClassId(classId)
      fetchClassDetail(classId)
    }
  }

  // 学生进度表列定义
  const studentColumns = [
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

  return (
    <div>
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
