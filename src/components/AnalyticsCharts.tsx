import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Experiment, Submission } from '@/lib/types'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { format, parseISO, startOfDay, subDays, eachDayOfInterval } from 'date-fns'
import { TrendUp, TrendDown, Target, CheckCircle } from '@phosphor-icons/react'

interface AnalyticsChartsProps {
  experiments: Experiment[]
  submissions: Submission[]
}

export function AnalyticsCharts({ experiments, submissions }: AnalyticsChartsProps) {
  const progressOverTime = useMemo(() => {
    if (submissions.length === 0) return []

    const endDate = new Date()
    const startDate = subDays(endDate, 30)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    return days.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const daySubmissions = submissions.filter(sub => {
        const subDate = parseISO(sub.submittedAt)
        return subDate >= dayStart && subDate <= dayEnd
      })

      const avgScore = daySubmissions.length > 0
        ? daySubmissions.reduce((sum, sub) => sum + sub.score, 0) / daySubmissions.length
        : null

      const passedCount = daySubmissions.filter(s => s.status === 'passed').length

      return {
        date: format(day, 'MMM dd'),
        avgScore: avgScore ? Math.round(avgScore) : null,
        submissions: daySubmissions.length,
        passed: passedCount
      }
    }).filter(day => day.submissions > 0 || day.avgScore !== null)
  }, [submissions])

  const experimentPerformance = useMemo(() => {
    return experiments.map(exp => {
      const expSubmissions = submissions.filter(s => s.experimentId === exp.id)
      const avgScore = expSubmissions.length > 0
        ? expSubmissions.reduce((sum, s) => sum + s.score, 0) / expSubmissions.length
        : 0
      const passRate = expSubmissions.length > 0
        ? (expSubmissions.filter(s => s.status === 'passed').length / expSubmissions.length) * 100
        : 0

      return {
        name: exp.title.length > 20 ? exp.title.substring(0, 20) + '...' : exp.title,
        avgScore: Math.round(avgScore),
        passRate: Math.round(passRate),
        attempts: expSubmissions.length
      }
    }).filter(exp => exp.attempts > 0)
  }, [experiments, submissions])

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { name: '0-20%', min: 0, max: 20, count: 0, color: '#ef4444' },
      { name: '21-40%', min: 21, max: 40, count: 0, color: '#f97316' },
      { name: '41-60%', min: 41, max: 60, count: 0, color: '#eab308' },
      { name: '61-80%', min: 61, max: 80, count: 0, color: '#84cc16' },
      { name: '81-100%', min: 81, max: 100, count: 0, color: '#22c55e' }
    ]

    submissions.forEach(sub => {
      const range = ranges.find(r => sub.score >= r.min && sub.score <= r.max)
      if (range) range.count++
    })

    return ranges.filter(r => r.count > 0)
  }, [submissions])

  const attemptsTrend = useMemo(() => {
    const expAttempts = experiments.map(exp => {
      const expSubmissions = submissions.filter(s => s.experimentId === exp.id)
      const sorted = [...expSubmissions].sort((a, b) => 
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      )

      return sorted.map((sub, index) => ({
        attempt: index + 1,
        score: sub.score,
        experiment: exp.title.substring(0, 15)
      }))
    }).flat()

    return expAttempts
  }, [experiments, submissions])

  const stats = useMemo(() => {
    const totalSubmissions = submissions.length
    const passedSubmissions = submissions.filter(s => s.status === 'passed').length
    const avgScore = totalSubmissions > 0
      ? submissions.reduce((sum, s) => sum + s.score, 0) / totalSubmissions
      : 0

    const recentSubmissions = submissions
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5)
    
    const previousSubmissions = submissions
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(5, 10)

    const recentAvg = recentSubmissions.length > 0
      ? recentSubmissions.reduce((sum, s) => sum + s.score, 0) / recentSubmissions.length
      : 0
    
    const previousAvg = previousSubmissions.length > 0
      ? previousSubmissions.reduce((sum, s) => sum + s.score, 0) / previousSubmissions.length
      : 0

    const trend = recentAvg - previousAvg

    return {
      totalSubmissions,
      passedSubmissions,
      passRate: totalSubmissions > 0 ? (passedSubmissions / totalSubmissions) * 100 : 0,
      avgScore: Math.round(avgScore),
      trend: Math.round(trend)
    }
  }, [submissions])

  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Target size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
        <h3 className="font-semibold mb-2">No Analytics Data Yet</h3>
        <p className="text-sm text-muted-foreground">
          Submit some experiments to see your progress analytics
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Score</span>
            {stats.trend !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${stats.trend > 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.trend > 0 ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
                {Math.abs(stats.trend)}%
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">{stats.avgScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.trend > 0 ? 'Improving!' : stats.trend < 0 ? 'Keep practicing' : 'Steady progress'}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Pass Rate</span>
            <CheckCircle size={16} className="text-success" weight="fill" />
          </div>
          <div className="text-3xl font-bold text-success">{Math.round(stats.passRate)}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.passedSubmissions} of {stats.totalSubmissions} passed
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Attempts</span>
          </div>
          <div className="text-3xl font-bold text-accent">{stats.totalSubmissions}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Across {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Completion</span>
          </div>
          <div className="text-3xl font-bold text-secondary">
            {experiments.filter(exp => 
              submissions.some(s => s.experimentId === exp.id && s.status === 'passed')
            ).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            of {experiments.length} completed
          </div>
        </Card>
      </div>

      {progressOverTime.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Progress Over Time (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={progressOverTime}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="oklch(0.65 0.18 200)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 260)" />
              <XAxis 
                dataKey="date" 
                stroke="oklch(0.50 0.02 260)"
                style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
              />
              <YAxis 
                stroke="oklch(0.50 0.02 260)"
                style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(0.98 0.005 260)',
                  border: '1px solid oklch(0.88 0.01 260)',
                  borderRadius: '8px',
                  fontFamily: 'Space Grotesk'
                }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '13px' }}
              />
              <Area 
                type="monotone" 
                dataKey="avgScore" 
                stroke="oklch(0.65 0.18 200)" 
                fill="url(#colorScore)"
                strokeWidth={2}
                name="Average Score (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {experimentPerformance.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Performance by Experiment</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={experimentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 260)" />
                <XAxis 
                  dataKey="name" 
                  stroke="oklch(0.50 0.02 260)"
                  style={{ fontSize: '11px', fontFamily: 'Space Grotesk' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="oklch(0.50 0.02 260)"
                  style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'oklch(0.98 0.005 260)',
                    border: '1px solid oklch(0.88 0.01 260)',
                    borderRadius: '8px',
                    fontFamily: 'Space Grotesk'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '13px' }}
                />
                <Bar dataKey="avgScore" fill="oklch(0.45 0.15 250)" name="Avg Score (%)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="passRate" fill="oklch(0.65 0.17 150)" name="Pass Rate (%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {scoreDistribution.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'oklch(0.98 0.005 260)',
                    border: '1px solid oklch(0.88 0.01 260)',
                    borderRadius: '8px',
                    fontFamily: 'Space Grotesk'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {attemptsTrend.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Score Improvement Across Attempts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attemptsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 260)" />
              <XAxis 
                dataKey="attempt" 
                stroke="oklch(0.50 0.02 260)"
                style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                label={{ value: 'Attempt Number', position: 'insideBottom', offset: -5, style: { fontFamily: 'Space Grotesk' } }}
              />
              <YAxis 
                stroke="oklch(0.50 0.02 260)"
                style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                domain={[0, 100]}
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fontFamily: 'Space Grotesk' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(0.98 0.005 260)',
                  border: '1px solid oklch(0.88 0.01 260)',
                  borderRadius: '8px',
                  fontFamily: 'Space Grotesk'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="oklch(0.45 0.15 250)" 
                strokeWidth={2}
                dot={{ fill: 'oklch(0.45 0.15 250)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
