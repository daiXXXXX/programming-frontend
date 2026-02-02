import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
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
import { Problem, Submission, DifficultyLevel } from '@/lib/types'
import { ProblemList } from '@/components/ProblemList'
import { ProblemDetail } from '@/components/ProblemDetail'
import { SubmissionHistory } from '@/components/SubmissionHistory'
import { DashboardStats } from '@/components/DashboardStats'
import { evaluateCode, calculateScore, getSubmissionStatus } from '@/lib/evaluator'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { I18nProvider } from '@/components/I18nProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/hooks/use-i18n'

const SAMPLE_PROBLEMS: Problem[] = [
  {
    id: '1',
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Given an array of integers and a target sum, return indices of the two numbers that add up to the target.',
    inputFormat: 'First line: array of integers separated by spaces\nSecond line: target integer',
    outputFormat: 'Two space-separated integers representing the indices (0-indexed)',
    constraints: '• 2 ≤ array length ≤ 10⁴\n• -10⁹ ≤ array[i] ≤ 10⁹\n• Only one valid answer exists',
    examples: [
      {
        input: '2 7 11 15\n9',
        output: '0 1',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
      },
      {
        input: '3 2 4\n6',
        output: '1 2',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6'
      }
    ],
    testCases: [
      { id: 't1', input: '2 7 11 15\n9', expectedOutput: '0 1' },
      { id: 't2', input: '3 2 4\n6', expectedOutput: '1 2' },
      { id: 't3', input: '3 3\n6', expectedOutput: '0 1' }
    ],
    tags: ['Array', 'Hash Table'],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Reverse String',
    difficulty: 'Easy',
    description: 'Write a function that reverses a string. The input string is given as an array of characters.',
    inputFormat: 'A single line containing a string',
    outputFormat: 'The reversed string',
    constraints: '• 1 ≤ string length ≤ 10⁵\n• String consists of printable ASCII characters',
    examples: [
      {
        input: 'hello',
        output: 'olleh',
        explanation: 'The string "hello" reversed is "olleh"'
      },
      {
        input: 'world',
        output: 'dlrow'
      }
    ],
    testCases: [
      { id: 't1', input: 'hello', expectedOutput: 'olleh' },
      { id: 't2', input: 'world', expectedOutput: 'dlrow' },
      { id: 't3', input: 'a', expectedOutput: 'a' }
    ],
    tags: ['String', 'Two Pointers'],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    description: 'Given a string, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.',
    inputFormat: 'A single line containing a string',
    outputFormat: 'true if palindrome, false otherwise',
    constraints: '• 1 ≤ string length ≤ 2 × 10⁵\n• String consists of printable ASCII characters',
    examples: [
      {
        input: 'A man, a plan, a canal: Panama',
        output: 'true',
        explanation: 'After removing non-alphanumeric and ignoring case: "amanaplanacanalpanama" is a palindrome'
      },
      {
        input: 'race a car',
        output: 'false'
      }
    ],
    testCases: [
      { id: 't1', input: 'A man, a plan, a canal: Panama', expectedOutput: 'true' },
      { id: 't2', input: 'race a car', expectedOutput: 'false' },
      { id: 't3', input: 'a', expectedOutput: 'true' }
    ],
    tags: ['String', 'Two Pointers'],
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    description: 'Given an integer array, find the contiguous subarray with the largest sum and return its sum.',
    inputFormat: 'Space-separated integers representing the array',
    outputFormat: 'A single integer representing the maximum sum',
    constraints: '• 1 ≤ array length ≤ 10⁵\n• -10⁴ ≤ array[i] ≤ 10⁴',
    examples: [
      {
        input: '-2 1 -3 4 -1 2 1 -5 4',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum = 6'
      },
      {
        input: '1',
        output: '1'
      }
    ],
    testCases: [
      { id: 't1', input: '-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
      { id: 't2', input: '1', expectedOutput: '1' },
      { id: 't3', input: '5 4 -1 7 8', expectedOutput: '23' }
    ],
    tags: ['Array', 'Dynamic Programming'],
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Merge Sorted Arrays',
    difficulty: 'Medium',
    description: 'Given two sorted integer arrays, merge them into a single sorted array.',
    inputFormat: 'First line: first sorted array (space-separated integers)\nSecond line: second sorted array (space-separated integers)',
    outputFormat: 'Space-separated integers representing the merged sorted array',
    constraints: '• 0 ≤ array length ≤ 1000\n• -10⁶ ≤ array[i] ≤ 10⁶',
    examples: [
      {
        input: '1 3 5\n2 4 6',
        output: '1 2 3 4 5 6'
      },
      {
        input: '1\n2',
        output: '1 2'
      }
    ],
    testCases: [
      { id: 't1', input: '1 3 5\n2 4 6', expectedOutput: '1 2 3 4 5 6' },
      { id: 't2', input: '1\n2', expectedOutput: '1 2' },
      { id: 't3', input: '1 2 3\n4 5 6', expectedOutput: '1 2 3 4 5 6' }
    ],
    tags: ['Array', 'Two Pointers'],
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    title: 'Binary Search',
    difficulty: 'Easy',
    description: 'Given a sorted array and a target value, return the index if the target is found. If not, return -1.',
    inputFormat: 'First line: sorted array (space-separated integers)\nSecond line: target integer',
    outputFormat: 'Index of target (0-indexed) or -1 if not found',
    constraints: '• 1 ≤ array length ≤ 10⁴\n• -10⁴ ≤ array[i], target ≤ 10⁴\n• All elements are unique',
    examples: [
      {
        input: '1 2 3 4 5\n3',
        output: '2'
      },
      {
        input: '1 2 3 4 5\n6',
        output: '-1'
      }
    ],
    testCases: [
      { id: 't1', input: '1 2 3 4 5\n3', expectedOutput: '2' },
      { id: 't2', input: '1 2 3 4 5\n6', expectedOutput: '-1' },
      { id: 't3', input: '1\n1', expectedOutput: '0' }
    ],
    tags: ['Array', 'Binary Search'],
    createdAt: new Date().toISOString()
  }
]

function AppContent() {
  const { t } = useI18n()
  const [problems, setProblems] = useKV<Problem[]>('oj-problems', [])
  const [submissions, setSubmissions] = useKV<Submission[]>('oj-submissions', [])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | 'All'>('All')

  useEffect(() => {
    if (!problems || problems.length === 0) {
      setProblems(SAMPLE_PROBLEMS)
    }
  }, [problems, setProblems])

  const problemsList = problems || []
  const submissionsList = submissions || []

  const handleSubmitCode = (problemId: string, code: string) => {
    const problem = problemsList.find(p => p.id === problemId)
    if (!problem || !code.trim()) {
      toast.error(t.messages.writeCodeFirst)
      return
    }

    const testResults = evaluateCode(code, problem.testCases)
    const score = calculateScore(testResults)
    const status = getSubmissionStatus(testResults)

    const newSubmission: Submission = {
      id: crypto.randomUUID(),
      problemId,
      code,
      language: 'JavaScript',
      submittedAt: new Date().toISOString(),
      testResults,
      score,
      status
    }

    setSubmissions((current) => [...(current || []), newSubmission])

    if (status === 'Accepted') {
      toast.success(`✓ ${t.messages.allTestsPassed} ${t.history.score}: ${score}%`)
    } else if (status === 'Runtime Error') {
      toast.error(`✗ ${t.messages.runtimeError}`)
    } else {
      toast.error(`✗ ${t.messages.wrongAnswer} ${testResults.filter(r => r.passed).length}/${testResults.length} ${t.messages.testsPassed}`)
    }

    return newSubmission
  }

  const handleViewProblem = (problem: Problem) => {
    setSelectedProblem(problem)
    setActiveTab('problems')
  }

  const filteredProblems = filterDifficulty === 'All' 
    ? problemsList 
    : problemsList.filter(p => p.difficulty === filterDifficulty)

  const solvedProblems = new Set(
    submissionsList
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
                problems={problemsList}
                submissions={submissionsList}
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
                submissions={submissionsList.filter(s => s.problemId === selectedProblem.id)}
                onBack={() => setSelectedProblem(null)}
                onSubmit={handleSubmitCode}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold">{t.history.title}</h2>
            <SubmissionHistory
              submissions={submissionsList}
              problems={problemsList}
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
