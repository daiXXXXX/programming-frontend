// API 配置 - Next.js版本
// 在Next.js中，API请求会通过rewrites代理到后端
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

// 获取存储的访问Token
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.accessToken || null
    }
  } catch {
    // ignore
  }
  return null
}

// 获取当前用户ID
function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.user?.id || null
    }
  } catch {
    // ignore
  }
  return null
}

// API 客户端
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit & { requireAuth?: boolean }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const { requireAuth = true, ...fetchOptions } = options || {}
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions?.headers as Record<string, string>),
    }

    // 添加认证头
    if (requireAuth) {
      const token = getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // 题目相关 API（公开）
  async getProblems(name?: string) {
    const query = name ? `?name=${encodeURIComponent(name)}` : ''
    return this.request<Problem[]>(`/problems${query}`, { requireAuth: false })
  }

  async getProblem(id: string | number) {
    return this.request<Problem>(`/problems/${id}`, { requireAuth: false })
  }

  // 题目管理API（需要教师权限）
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

  // 提交相关 API（需要登录）
  async submitCode(data: SubmitCodeRequest): Promise<Submission> {
    const userId = getCurrentUserId()
    const url = `${this.baseURL}/submissions`
    const token = getAccessToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...data,
        userId: userId || 1,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || error.message || `HTTP ${response.status}`)
    }

    const submission: Submission = await response.json()

    // 202 表示异步评测（Redis 队列模式），submission.status 为 'Pending'
    // 201 表示同步评测，结果已经在 submission 中
    return submission
  }

  async getSubmission(id: string | number) {
    return this.request<Submission>(`/submissions/${id}`)
  }

  async getUserSubmissions(userId?: number, limit = 100, offset = 0) {
    const uid = userId || getCurrentUserId() || 1
    return this.request<Submission[]>(`/submissions/user/${uid}?limit=${limit}&offset=${offset}`)
  }

  async getProblemSubmissions(problemId: string | number, limit = 100, offset = 0) {
    return this.request<Submission[]>(`/submissions/problem/${problemId}?limit=${limit}&offset=${offset}`)
  }

  // 统计相关 API（需要登录）
  async getUserStats(userId?: number) {
    const uid = userId || getCurrentUserId() || 1
    return this.request<UserStats>(`/stats/user/${uid}`)
  }

  // 排行榜相关 API（公开）
  async getTotalSolvedRanking(limit: number = 50) {
    return this.request<RankingUser[]>(`/ranking/total?limit=${limit}`, { requireAuth: false })
  }

  async getTodaySolvedRanking(limit: number = 50) {
    return this.request<RankingUser[]>(`/ranking/today?limit=${limit}`, { requireAuth: false })
  }

  // 每日活动数据 API（需要登录）
  async getDailyActivity(userId?: number, start?: string, end?: string) {
    const uid = userId || getCurrentUserId() || 1
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<DailyActivity[]>(`/stats/user/${uid}/activity${query}`)
  }

  // ==================== 题解相关 API ====================

  // 获取题目的题解列表
  async getSolutions(problemId: number, order = 'newest', limit = 20, offset = 0) {
    return this.request<SolutionListResponse>(
      `/solutions/problem/${problemId}?order=${order}&limit=${limit}&offset=${offset}`,
      { requireAuth: false }
    )
  }

  // 获取题解详情
  async getSolution(id: number) {
    return this.request<Solution>(`/solutions/${id}`, { requireAuth: false })
  }

  // 创建题解
  async createSolution(data: CreateSolutionRequest) {
    return this.request<Solution>('/solutions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // 更新题解
  async updateSolution(id: number, data: UpdateSolutionRequest) {
    return this.request<{ message: string }>(`/solutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // 删除题解
  async deleteSolution(id: number) {
    return this.request<{ message: string }>(`/solutions/${id}`, {
      method: 'DELETE',
    })
  }

  // 点赞/取消点赞
  async toggleSolutionLike(id: number) {
    return this.request<{ liked: boolean; likeCount: number }>(`/solutions/${id}/like`, {
      method: 'POST',
    })
  }

  // 获取题解评论
  async getSolutionComments(solutionId: number, limit = 20, offset = 0) {
    return this.request<CommentListResponse>(
      `/solutions/${solutionId}/comments?limit=${limit}&offset=${offset}`,
      { requireAuth: false }
    )
  }

  // 创建评论
  async createComment(solutionId: number, data: CreateCommentRequest) {
    return this.request<SolutionComment>(`/solutions/${solutionId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // 删除评论
  async deleteComment(commentId: number) {
    return this.request<{ message: string }>(`/solutions/comments/${commentId}`, {
      method: 'DELETE',
    })
  }
}

// 导出 API 客户端实例
export const api = new ApiClient(API_BASE_URL)

// 类型定义（与后端保持一致）
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'
export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Pending'

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

export interface RankingUser {
  userId: number
  username: string
  avatar: string
  totalSolved: number
  todaySolved: number
  rank: number
}

export interface DailyActivity {
  userId: number
  date: string           // "2006-01-02"
  submissionCount: number
  solvedCount: number
}

// ==================== 题解相关类型 ====================

export interface SolutionAuthor {
  id: number
  username: string
  avatar: string
}

export interface Solution {
  id: number
  problemId: number
  userId: number
  title: string
  content: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  author?: SolutionAuthor
  liked: boolean
}

export interface SolutionComment {
  id: number
  solutionId: number
  userId: number
  parentId?: number | null
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
  author?: SolutionAuthor
  replies?: SolutionComment[]
}

export interface SolutionListResponse {
  solutions: Solution[] | null
  total: number
  limit: number
  offset: number
}

export interface CommentListResponse {
  comments: SolutionComment[] | null
  total: number
  limit: number
  offset: number
}

export interface CreateSolutionRequest {
  problemId: number
  title: string
  content: string
}

export interface UpdateSolutionRequest {
  title: string
  content: string
}

export interface CreateCommentRequest {
  content: string
  parentId?: number | null
}

// ==================== WebSocket 消息类型 ====================

export type WSMessageType = 'chat' | 'system_notice' | 'new_comment' | 'new_solution' | 'like_notify' | 'online_count' | 'judge_result'

export interface WSMessage {
  type: WSMessageType
  channel?: string
  from?: SolutionAuthor
  content: any
  timestamp: string
}
