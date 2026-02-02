import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Code, 
  ChartBar, 
  List,
  Play,
  Trophy,
  Fire
} from '@phosphor-icons/react'
import { DifficultyLevel } from '@/lib/types'
import { api, Problem, Submission } from '@/lib/api'
import { ProblemList } from '@/components/ProblemList'
import { ProblemDetail } from '@/components/ProblemDetail'
import { SubmissionHistory } from '@/components/SubmissionHistory'
import { DashboardStats } from '@/components/DashboardStats'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { I18nProvider } from '@/components/I18nProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/hooks/use-i18n'

function AppContent() {
  const { t } = useI18n()
  const [problems, setProblems] = useState<Problem[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | 'All'>('All')
  const [loading, setLoading] = useState(false)

  // 加载题目列表
  useEffect(() => {
    loadProblems()
    loadSubmissions()
  }, [])

  const loadProblems = async () => {
    try {
      setLoading(true)
      const data = await api.getProblems()
      setProblems(data)
    } catch (error) {
      console.error('Failed to load problems:', error)
      toast.error((t.messages as Record<string, string> | undefined)?.loadFailed || 'Failed to load problems')
    } finally {
      setLoading(false)
    }
  }

  const loadSubmissions = async () => {
    try {
      const data = await api.getUserSubmissions()
      setSubmissions(data)
    } catch (error) {
      console.error('Failed to load submissions:', error)
    }
  }

  const handleSubmitCode = async (problemId: string, code: string) => {
    if (!code.trim()) {
      toast.error(t.messages.writeCodeFirst)
      return
    }

    try {
      setLoading(true)
      const submission = await api.submitCode({
        problemId: Number(problemId),
        code,
        language: 'JavaScript'
      })

      // 更新本地提交列表
      setSubmissions((current) => [submission, ...current])

      if (submission.status === 'Accepted') {
        toast.success(`✓ ${t.messages.allTestsPassed} ${t.history.score}: ${submission.score}%`)
      } else if (submission.status === 'Runtime Error') {
        toast.error(`✗ ${t.messages.runtimeError}`)
      } else {
        const passedCount = submission.testResults?.filter(r => r.passed).length || 0
        const totalCount = submission.testResults?.length || 0
        toast.error(`✗ ${t.messages.wrongAnswer} ${passedCount}/${totalCount} ${t.messages.testsPassed}`)
      }

      return submission
    } catch (error) {
      console.error('Failed to submit code:', error)
      toast.error((t.messages as Record<string, string> | undefined)?.submitFailed || 'Failed to submit code')
    } finally {
      setLoading(false)
    }
  }

  const handleViewProblem = (problem: Problem) => {
    setSelectedProblem(problem)
    setActiveTab('problems')
  }

  const filteredProblems = filterDifficulty === 'All' 
    ? problems 
    : problems.filter(p => p.difficulty === filterDifficulty)

  const solvedProblems = new Set(
    submissions
      .filter(s => s.status === 'Accepted')
      .map(s => s.problemId)
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code size={32} weight="duotone" className="text-primary" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.header.title}</h1>
                <p className="text-sm text-muted-foreground">{t.header.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Trophy size={20} className="text-accent" weight="fill" />
                <span className="font-semibold">{solvedProblems.size}</span>
                <span className="text-muted-foreground">{t.header.solved}</span>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xl grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="gap-2">
              <ChartBar size={18} />
              {t.tabs.dashboard}
            </TabsTrigger>
            <TabsTrigger value="problems" className="gap-2">
              <Code size={18} />
              {t.tabs.problems}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <List size={18} />
              {t.tabs.history}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DashboardStats 
                problems={problems}
                submissions={submissions}
                onViewProblem={handleViewProblem}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="problems" className="space-y-6">
            {!selectedProblem ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{t.problems.title}</h2>
                  <div className="flex gap-2">
                    {(['All', 'Easy', 'Medium', 'Hard'] as const).map(level => (
                      <Button
                        key={level}
                        variant={filterDifficulty === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterDifficulty(level)}
                      >
                        {level === 'All' ? t.problems.all : level === 'Easy' ? t.problems.easy : level === 'Medium' ? t.problems.medium : t.problems.hard}
                      </Button>
                    ))}
                  </div>
                </div>
                <ProblemList
                  problems={filteredProblems}
                  solvedProblems={solvedProblems}
                  onSelectProblem={setSelectedProblem}
                />
              </>
            ) : (
              <ProblemDetail
                problem={selectedProblem}
                submissions={submissions.filter(s => s.problemId === Number(selectedProblem.id))}
                onBack={() => setSelectedProblem(null)}
                onSubmit={handleSubmitCode}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold">{t.history.title}</h2>
            <SubmissionHistory
              submissions={submissions}
              problems={problems}
              onViewProblem={handleViewProblem}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}

export default App
