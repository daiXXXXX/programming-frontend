import { User, UserRole } from '@/store/authStore'

const API_BASE = '/api'

// 请求配置
interface RequestConfig extends RequestInit {
  requireAuth?: boolean
}

// 认证响应
export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 注册请求
export interface RegisterRequest {
  username: string
  email: string
  password: string
  role?: UserRole
}

// 刷新Token请求
export interface RefreshRequest {
  refreshToken: string
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

// 更新个人信息请求
export interface UpdateProfileRequest {
  username: string
  email: string
  avatar: string
  bio: string
}

// API错误
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// 获取存储的Token
function getStoredAuth(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        accessToken: parsed.state?.accessToken || null,
        refreshToken: parsed.state?.refreshToken || null,
      }
    }
  } catch {
    // ignore
  }
  return { accessToken: null, refreshToken: null }
}

// 带Token的请求
async function authFetch<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requireAuth = false, ...fetchConfig } = config

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchConfig.headers as Record<string, string>),
  }

  if (requireAuth) {
    const { accessToken } = getStoredAuth()
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchConfig,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'unknown_error',
      message: 'An unknown error occurred',
    }))
    throw new AuthError(error.message, error.error, response.status)
  }

  return response.json()
}

// 认证API
export const authApi = {
  // 注册
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return authFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 登录
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return authFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 刷新Token
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    return authFetch<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  // 获取当前用户
  getCurrentUser: async (): Promise<User> => {
    return authFetch<User>('/auth/me', {
      method: 'GET',
      requireAuth: true,
    })
  },

  // 修改密码
  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    return authFetch<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth: true,
    })
  },

  // 更新个人信息
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    return authFetch<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      requireAuth: true,
    })
  },

  // 上传头像
  uploadAvatar: async (file: File): Promise<{ avatar: string; message: string }> => {
    const formData = new FormData()
    formData.append('avatar', file)

    const { accessToken } = getStoredAuth()
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_BASE}/auth/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'unknown_error',
        message: 'An unknown error occurred',
      }))
      throw new AuthError(error.message, error.error, response.status)
    }

    return response.json()
  },
}

// Token刷新逻辑
let refreshPromise: Promise<AuthResponse> | null = null

export async function refreshTokenIfNeeded(): Promise<string | null> {
  const { accessToken, refreshToken } = getStoredAuth()

  if (!refreshToken) {
    return null
  }

  // 检查Token是否过期（提前1分钟刷新）
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      const expiresAt = parsed.state?.expiresAt
      if (expiresAt) {
        const expiry = new Date(expiresAt)
        const now = new Date()
        const oneMinute = 60 * 1000

        if (expiry.getTime() - now.getTime() > oneMinute) {
          return accessToken
        }
      }
    }
  } catch {
    // ignore
  }

  // 避免并发刷新
  if (refreshPromise) {
    const result = await refreshPromise
    return result.accessToken
  }

  refreshPromise = authApi.refresh(refreshToken)
  try {
    const result = await refreshPromise
    // 更新存储
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.state = {
        ...parsed.state,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      }
      localStorage.setItem('auth-storage', JSON.stringify(parsed))
    }
    return result.accessToken
  } finally {
    refreshPromise = null
  }
}
