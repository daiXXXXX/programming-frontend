import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Experiment, Submission } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { 
  TrendUp, 
  TrendDown, 
  Users, 
  Target, 
  Warning,
  CheckCircle,
  Clock
} from '@phosphor-icons/react'

interface InstructorAnalyticsProps {
  experiments: Experiment[]
  submissions: Submission[]
}

export function InstructorAnalytics({ experiments, submissions }: InstructorAnalyticsProps) {
  const classMetrics = useMemo(() => {
    const totalStudents = new Set(submissions.map(s => s.id.split('-')[0])).size || 1
    const activeStudents = new Set(
      submissions
        .filter(s => {
          const daysSince = (Date.now() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
          return daysSince <= 7
        })
        .map(s => s.id.split('-')[0])
    ).size

    const avgScore = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length
      : 0

    const passRate = submissions.length > 0
      ? (submissions.filter(s => s.status === 'passed').length / submissions.length) * 100
      : 0

    const completionRate = experiments.length > 0
      ? (experiments.filter(exp => 
          submissions.some(s => s.experimentId === exp.id && s.status === 'passed')
        ).length / experiments.length) * 100
      : 0

    const avgAttempts = experiments.length > 0
      ? experiments.reduce((sum, exp) => {
          const expSubmissions = submissions.filter(s => s.experimentId === exp.id)
          return sum + expSubmissions.length
        }, 0) / experiments.length
      : 0

    return {
      totalStudents,
      activeStudents,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      completionRate: Math.round(completionRate),
      avgAttempts: Math.round(avgAttempts * 10) / 10,
      engagementRate: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0
    }
  }, [experiments, submissions])

  const experimentDifficulty = useMemo(() => {
    return experiments.map(exp => {
      const expSubmissions = submissions.filter(s => s.experimentId === exp.id)
      const avgScore = expSubmissions.length > 0
        ? expSubmissions.reduce((sum, s) => sum + s.score, 0) / expSubmissions.length
        : 0
      
      const firstAttemptPasses = expSubmissions.filter((s, index, arr) => {
        const prevSubmissions = arr.filter(ps => 
          ps.experimentId === s.experimentId && 
          new Date(ps.submittedAt) < new Date(s.submittedAt)
        )
        return prevSubmissions.length === 0 && s.status === 'passed'
      }).length

      const avgAttempts = expSubmissions.length > 0 ? expSubmissions.length : 0

      return {
        name: exp.title.length > 15 ? exp.title.substring(0, 15) + '...' : exp.title,
        avgScore: Math.round(avgScore),
        firstAttemptPass: expSubmissions.length > 0 
          ? Math.round((firstAttemptPasses / expSubmissions.length) * 100) 
          : 0,
        avgAttempts,
        submissions: expSubmissions.length
      }
    }).filter(exp => exp.submissions > 0)
  }, [experiments, submissions])

  const performanceDistribution = useMemo(() => {
    if (submissions.length === 0) return []

    const scores = submissions.map(s => s.score)
    const ranges = [
      { range: '0-20%', count: scores.filter(s => s <= 20).length },
      { range: '21-40%', count: scores.filter(s => s > 20 && s <= 40).length },
      { range: '41-60%', count: scores.filter(s => s > 40 && s <= 60).length },
      { range: '61-80%', count: scores.filter(s => s > 60 && s <= 80).length },
      { range: '81-100%', count: scores.filter(s => s > 80).length }
    ]

    return ranges
  }, [submissions])

  const experimentInsights = useMemo(() => {
    return experiments.map(exp => {
      const expSubmissions = submissions.filter(s => s.experimentId === exp.id)
      
      const failedTestCases = expSubmissions.flatMap(s => 
        s.testResults.filter(t => !t.passed).map(t => t.testCaseId)
      )
      
      const testCaseFailureRate = new Map<string, number>()
      failedTestCases.forEach(tcId => {
        testCaseFailureRate.set(tcId, (testCaseFailureRate.get(tcId) || 0) + 1)
      })

      const mostFailedTestCase = Array.from(testCaseFailureRate.entries())
        .sort((a, b) => b[1] - a[1])[0]

      const avgScore = expSubmissions.length > 0
        ? expSubmissions.reduce((sum, s) => sum + s.score, 0) / expSubmissions.length
        : 0

      return {
        experiment: exp,
        avgScore: Math.round(avgScore),
        submissions: expSubmissions.length,
        mostFailedTest: mostFailedTestCase 
          ? exp.testCases.find(tc => tc.id === mostFailedTestCase[0])?.description || 'Unknown'
          : 'None',
        failureCount: mostFailedTestCase ? mostFailedTestCase[1] : 0
      }
    }).filter(insight => insight.submissions > 0)
  }, [experiments, submissions])

  const difficultyProfile = useMemo(() => {
    if (experimentDifficulty.length === 0) return []

    const avgScores = experimentDifficulty.map(e => e.avgScore)
    const avgOfAvg = avgScores.reduce((a, b) => a + b, 0) / avgScores.length

    return experimentDifficulty.map(exp => ({
      experiment: exp.name,
      difficulty: 100 - exp.avgScore,
      engagement: (exp.avgAttempts / 5) * 100,
      effectiveness: exp.firstAttemptPass,
      clarity: exp.avgScore > avgOfAvg ? exp.avgScore : 50
    }))
  }, [experimentDifficulty])

  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
        <h3 className="font-semibold mb-2">No Student Data Yet</h3>
        <p className="text-sm text-muted-foreground">
          Instructor analytics will appear once students start submitting experiments
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Class Score</span>
            {classMetrics.avgScore >= 70 ? (
              <TrendUp size={16} className="text-success" weight="bold" />
            ) : (
              <TrendDown size={16} className="text-warning" weight="bold" />
            )}
          </div>
          <div className="text-3xl font-bold text-primary">{classMetrics.avgScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Across {submissions.length} submissions
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Pass Rate</span>
            <CheckCircle size={16} className="text-success" weight="fill" />
          </div>
          <div className="text-3xl font-bold text-success">{classMetrics.passRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Overall success rate
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Active Students</span>
            <Users size={16} className="text-accent" weight="fill" />
          </div>
          <div className="text-3xl font-bold text-accent">
            {classMetrics.activeStudents}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {classMetrics.engagementRate}% engagement (7 days)
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Attempts</span>
            <Target size={16} className="text-warning" weight="fill" />
          </div>
          <div className="text-3xl font-bold text-warning">{classMetrics.avgAttempts}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Per experiment
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {experimentDifficulty.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Experiment Difficulty Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={experimentDifficulty}>
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
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'oklch(0.98 0.005 260)',
                    border: '1px solid oklch(0.88 0.01 260)',
                    borderRadius: '8px',
                    fontFamily: 'Space Grotesk'
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '13px' }} />
                <Bar dataKey="avgScore" fill="oklch(0.45 0.15 250)" name="Avg Score" radius={[8, 8, 0, 0]} />
                <Bar dataKey="avgAttempts" fill="oklch(0.75 0.15 70)" name="Avg Attempts" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {performanceDistribution.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Class Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 260)" />
                <XAxis 
                  dataKey="range" 
                  stroke="oklch(0.50 0.02 260)"
                  style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                />
                <YAxis 
                  stroke="oklch(0.50 0.02 260)"
                  style={{ fontSize: '12px', fontFamily: 'Space Grotesk' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'oklch(0.98 0.005 260)',
                    border: '1px solid oklch(0.88 0.01 260)',
                    borderRadius: '8px',
                    fontFamily: 'Space Grotesk'
                  }}
                />
                <Bar dataKey="count" fill="oklch(0.65 0.18 200)" name="Submissions" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {difficultyProfile.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Experiment Quality Profile</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={difficultyProfile}>
              <PolarGrid stroke="oklch(0.88 0.01 260)" />
              <PolarAngleAxis 
                dataKey="experiment" 
                style={{ fontSize: '11px', fontFamily: 'Space Grotesk' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                style={{ fontSize: '10px', fontFamily: 'Space Grotesk' }}
              />
              <Radar 
                name="Difficulty" 
                dataKey="difficulty" 
                stroke="oklch(0.60 0.22 25)" 
                fill="oklch(0.60 0.22 25)" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Engagement" 
                dataKey="engagement" 
                stroke="oklch(0.45 0.15 250)" 
                fill="oklch(0.45 0.15 250)" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Effectiveness" 
                dataKey="effectiveness" 
                stroke="oklch(0.65 0.17 150)" 
                fill="oklch(0.65 0.17 150)" 
                fillOpacity={0.3} 
              />
              <Legend wrapperStyle={{ fontFamily: 'Space Grotesk', fontSize: '13px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(0.98 0.005 260)',
                  border: '1px solid oklch(0.88 0.01 260)',
                  borderRadius: '8px',
                  fontFamily: 'Space Grotesk'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {experimentInsights.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Problem Areas by Experiment</h3>
          <div className="space-y-4">
            {experimentInsights.map(insight => (
              <div key={insight.experiment.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{insight.experiment.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {insight.submissions} submission{insight.submissions !== 1 ? 's' : ''} · 
                      Avg Score: {insight.avgScore}%
                    </p>
                  </div>
                  <Badge 
                    variant={insight.avgScore >= 70 ? 'default' : 'secondary'}
                    className={insight.avgScore >= 70 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-warning text-warning-foreground'
                    }
                  >
                    {insight.avgScore >= 70 ? 'Good' : 'Needs Review'}
                  </Badge>
                </div>
                {insight.failureCount > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                    <Warning size={16} className="text-warning mt-0.5" weight="fill" />
                    <div className="text-sm">
                      <span className="font-medium text-warning">Most Failed Test:</span>{' '}
                      <span className="text-muted-foreground">
                        {insight.mostFailedTest} ({insight.failureCount} failure{insight.failureCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                )}
                {insight !== experimentInsights[experimentInsights.length - 1] && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
