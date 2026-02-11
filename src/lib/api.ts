// API 配置 - Next.js版本
// 在Next.js中，API请求会通过rewrites代理到后端
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

// 默认用户ID（在实现登录功能前使用）
const DEFAULT_USER_ID = 1

// API 客户端
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // 题目相关 API
  async getProblems() {
    return this.request<Problem[]>('/problems')
  }

  async getProblem(id: string | number) {
    return this.request<Problem>(`/problems/${id}`)
  }

  async createProblem(data: CreateProblemRequest) {
    return this.request<Problem>('/problems', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProblem(id: string | number, data: CreateProblemRequest) {
    return this.request<Problem>(`/problems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProblem(id: string | number) {
    return this.request<{ message: string }>(`/problems/${id}`, {
      method: 'DELETE',
    })
  }

  // 提交相关 API
  async submitCode(data: SubmitCodeRequest) {
    return this.request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        userId: DEFAULT_USER_ID,
      }),
    })
  }

  async getSubmission(id: string | number) {
    return this.request<Submission>(`/submissions/${id}`)
  }

  async getUserSubmissions(userId: number = DEFAULT_USER_ID, limit = 100, offset = 0) {
    return this.request<Submission[]>(`/submissions/user/${userId}?limit=${limit}&offset=${offset}`)
  }

  async getProblemSubmissions(problemId: string | number, limit = 100, offset = 0) {
    return this.request<Submission[]>(`/submissions/problem/${problemId}?limit=${limit}&offset=${offset}`)
  }

  // 统计相关 API
  async getUserStats(userId: number = DEFAULT_USER_ID) {
    return this.request<UserStats>(`/stats/user/${userId}`)
  }
}

// 导出 API 客户端实例
export const api = new ApiClient(API_BASE_URL)

// 类型定义（与后端保持一致）
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'
export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded'

export interface TestCase {
  id: number
  input: string
  expectedOutput: string
  description?: string
}

export interface Problem {
  id: number
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
  updatedAt?: string
}

export interface TestResult {
  testCaseId: number
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput?: string
  error?: string
  executionTime?: number
}

export interface Submission {
  id: number
  problemId: number
  userId: number
  code: string
  language: string
  status: SubmissionStatus
  score: number
  testResults?: TestResult[]
  submittedAt: string
}

export interface UserStats {
  userId: number
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSubmissions: number
  acceptedSubmissions: number
  successRate: number
}

export interface CreateProblemRequest {
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
  testCases: {
    input: string
    expectedOutput: string
    description?: string
    isSample?: boolean
  }[]
  tags: string[]
}

export interface SubmitCodeRequest {
  problemId: number
  code: string
  language?: string
}
