'use client'

import { useEffect, useRef } from 'react'
import { Problem, Submission } from '@/lib/api'
import { Card, Tag, Typography, Row, Col, Statistic } from 'antd'
import { TrophyOutlined, CheckCircleFilled, FireOutlined, RiseOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'
import { useI18n } from '@/hooks/use-i18n'

const { Text, Title } = Typography

interface DashboardStatsProps {
  problems: Problem[]
  submissions: Submission[]
  onViewProblem: (problem: Problem) => void
}

export function DashboardStats({ problems, submissions, onViewProblem }: DashboardStatsProps) {
  const { t } = useI18n()
  const chartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)

  const solvedProblems = new Set(
    submissions
      .filter(s => s.status === 'Accepted')
      .map(s => s.problemId)
  )

  const easySolved = problems.filter(p => p.difficulty === 'Easy' && solvedProblems.has(p.id)).length
  const mediumSolved = problems.filter(p => p.difficulty === 'Medium' && solvedProblems.has(p.id)).length
  const hardSolved = problems.filter(p => p.difficulty === 'Hard' && solvedProblems.has(p.id)).length

  const easyTotal = problems.filter(p => p.difficulty === 'Easy').length
  const mediumTotal = problems.filter(p => p.difficulty === 'Medium').length
  const hardTotal = problems.filter(p => p.difficulty === 'Hard').length

  const totalSolved = solvedProblems.size
  const totalProblems = problems.length
  const successRate = submissions.length > 0 
    ? Math.round((submissions.filter(s => s.status === 'Accepted').length / submissions.length) * 100)
    : 0

  useEffect(() => {
    if (!chartRef.current || submissions.length === 0) return

    const chart = echarts.init(chartRef.current)
    
    const submissionsByDate = submissions.reduce((acc, sub) => {
      const date = new Date(sub.submittedAt).toLocaleDateString()
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dates = Object.keys(submissionsByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    ).slice(-7)

    const counts = dates.map(date => submissionsByDate[date])

    const option = {
      title: {
        text: t.dashboard.recentActivity,
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'Space Grotesk'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        minInterval: 1
      },
      series: [{
        data: counts,
        type: 'bar',
        itemStyle: {
          color: '#4F9DFF',
          borderRadius: [4, 4, 0, 0]
        }
      }],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      }
    }

    chart.setOption(option)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [submissions])

  useEffect(() => {
    if (!pieChartRef.current || totalSolved === 0) return

    const chart = echarts.init(pieChartRef.current)
    
    const option = {
      title: {
        text: t.dashboard.difficultyBreakdown,
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'Space Grotesk'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data: [
          { value: easySolved, name: t.dashboard.easy, itemStyle: { color: '#52C41A' } },
          { value: mediumSolved, name: t.dashboard.medium, itemStyle: { color: '#FAAD14' } },
          { value: hardSolved, name: t.dashboard.hard, itemStyle: { color: '#FF4D4F' } }
        ].filter(item => item.value > 0)
      }]
    }

    chart.setOption(option)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [easySolved, mediumSolved, hardSolved, totalSolved])

  const recentlySolved = problems
    .filter(p => solvedProblems.has(p.id))
    .sort((a, b) => {
      const aLastSubmission = submissions
        .filter(s => s.problemId === a.id && s.status === 'Accepted')
        .sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime())[0]
      const bLastSubmission = submissions
        .filter(s => s.problemId === b.id && s.status === 'Accepted')
        .sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime())[0]
      
      if (!aLastSubmission || !bLastSubmission) return 0
      return new Date(bLastSubmission.submittedAt).getTime() - new Date(aLastSubmission.submittedAt).getTime()
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <Statistic
                title={<span className="text-indigo-700">{t.dashboard.totalProblems}</span>}
                value={totalSolved}
                prefix={<TrophyOutlined style={{ color: '#4f46e5' }} />}
                suffix={<Text type="secondary">/ {totalProblems}</Text>}
              />
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <Statistic
                title={<span className="text-green-700">{t.dashboard.easy}</span>}
                value={easySolved}
                prefix={<CheckCircleFilled style={{ color: '#52c41a' }} />}
                suffix={<Text type="secondary">/ {easyTotal}</Text>}
              />
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <Statistic
                title={<span className="text-orange-700">{t.dashboard.medium}</span>}
                value={mediumSolved}
                prefix={<FireOutlined style={{ color: '#faad14' }} />}
                suffix={<Text type="secondary">/ {mediumTotal}</Text>}
              />
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <Statistic
                title={<span className="text-red-700">{t.dashboard.hard}</span>}
                value={hardSolved}
                prefix={<RiseOutlined style={{ color: '#ff4d4f' }} />}
                suffix={<Text type="secondary">/ {hardTotal}</Text>}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card>
            <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card>
            <div ref={pieChartRef} style={{ width: '100%', height: '300px' }} />
          </Card>
        </Col>
      </Row>

      {recentlySolved.length > 0 && (
        <Card title={t.dashboard.recentActivity}>
          <div className="space-y-2">
            {recentlySolved.map(problem => (
              <div
                key={problem.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onViewProblem(problem)}
              >
                <div className="flex items-center gap-3">
                  <CheckCircleFilled style={{ color: '#52c41a', fontSize: 20 }} />
                  <Text strong>{problem.title}</Text>
                </div>
                <Tag>{problem.difficulty}</Tag>
              </div>
            ))}
          </div>
        </Card>
      )}

      {problems.length > 0 && totalSolved === 0 && (
        <Card className="text-center bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <FireOutlined style={{ fontSize: 48, color: '#06b6d4' }} />
          <Title level={4} className="mt-4">{t.dashboard.quickStart}</Title>
          <Text type="secondary">
            {problems.length} {t.dashboard.startPracticing}
          </Text>
        </Card>
      )}
    </div>
  )
}
