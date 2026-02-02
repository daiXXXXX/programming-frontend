import { useEffect, useRef } from 'react'
import { Problem, Submission } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, CheckCircle, Fire, TrendUp } from '@phosphor-icons/react'
import * as echarts from 'echarts'
import { motion } from 'framer-motion'

interface DashboardStatsProps {
  problems: Problem[]
  submissions: Submission[]
  onViewProblem: (problem: Problem) => void
}

export function DashboardStats({ problems, submissions, onViewProblem }: DashboardStatsProps) {
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
        text: 'Submission Activity',
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
        text: 'Problems by Difficulty',
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
          { value: easySolved, name: 'Easy', itemStyle: { color: '#52C41A' } },
          { value: mediumSolved, name: 'Medium', itemStyle: { color: '#FAAD14' } },
          { value: hardSolved, name: 'Hard', itemStyle: { color: '#FF4D4F' } }
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={24} weight="fill" className="text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Solved</span>
            </div>
            <div className="text-3xl font-bold">{totalSolved}</div>
            <div className="text-xs text-muted-foreground mt-1">out of {totalProblems} problems</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={24} weight="fill" className="text-success" />
              <span className="text-sm font-medium text-muted-foreground">Easy</span>
            </div>
            <div className="text-3xl font-bold">{easySolved}</div>
            <div className="text-xs text-muted-foreground mt-1">out of {easyTotal}</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <div className="flex items-center gap-3 mb-2">
              <Fire size={24} weight="fill" className="text-warning" />
              <span className="text-sm font-medium text-muted-foreground">Medium</span>
            </div>
            <div className="text-3xl font-bold">{mediumSolved}</div>
            <div className="text-xs text-muted-foreground mt-1">out of {mediumTotal}</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendUp size={24} weight="fill" className="text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">Hard</span>
            </div>
            <div className="text-3xl font-bold">{hardSolved}</div>
            <div className="text-xs text-muted-foreground mt-1">out of {hardTotal}</div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
        </Card>

        <Card className="p-6">
          <div ref={pieChartRef} style={{ width: '100%', height: '300px' }} />
        </Card>
      </div>

      {recentlySolved.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Recently Solved</h3>
          <div className="space-y-2">
            {recentlySolved.map(problem => (
              <div
                key={problem.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => onViewProblem(problem)}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} weight="fill" className="text-success" />
                  <span className="font-medium">{problem.title}</span>
                </div>
                <Badge variant="outline">{problem.difficulty}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {problems.length > 0 && totalSolved === 0 && (
        <Card className="p-12 text-center bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <Fire size={48} className="mx-auto text-accent mb-4" weight="duotone" />
          <h3 className="font-semibold text-lg mb-2">Start Your Journey!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {problems.length} problems are waiting for you. Start solving to see your progress here.
          </p>
        </Card>
      )}
    </div>
  )
}
