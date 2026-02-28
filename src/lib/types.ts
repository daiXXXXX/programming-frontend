export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'
export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded'

export interface TestCase {
  id: string
  input: string
  expectedOutput: string
  description?: string
}

export interface Problem {
  id: string
  title: string
  difficulty: DifficultyLevel
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  examples: {
    input: string
    output: string
    explanation?: string
  }[]
  testCases: TestCase[]
  tags: string[]
  createdAt: string
}

export interface TestResult {
  testCaseId: string
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput?: string
  error?: string
  executionTime?: number
}

export interface Submission {
  id: string
  problemId: string
  code: string
  language: string
  submittedAt: string
  testResults: TestResult[]
  score: number
  status: SubmissionStatus
}

export interface UserStats {
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSubmissions: number
  acceptedSubmissions: number
  successRate: number
}

export interface RankingUser {
  userId: number
  username: string
  avatar: string
  totalSolved: number
  todaySolved: number
  rank: number
}
