export type UserRole = 'instructor' | 'student'

export interface TestCase {
  id: string
  input: string
  expectedOutput: string
  description?: string
}

export interface Experiment {
  id: string
  title: string
  description: string
  requirements: string
  testCases: TestCase[]
  deadline: string
  createdAt: string
}

export interface TestResult {
  testCaseId: string
  passed: boolean
  actualOutput?: string
  error?: string
}

export interface Submission {
  id: string
  experimentId: string
  code: string
  submittedAt: string
  testResults: TestResult[]
  score: number
  status: 'passed' | 'failed' | 'error'
}

export interface UserContext {
  role: UserRole
  name: string
  id: string
}
