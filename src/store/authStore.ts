import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 用户角色类型
export type UserRole = 'student' | 'instructor' | 'admin'

// 用户信息
export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  avatar: string
  bio: string
  createdAt: string
}

// 认证状态
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 认证操作
interface AuthActions {
  setAuth: (data: {
    user: User
    accessToken: string
    refreshToken: string
    expiresAt: string
  }) => void
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  isTokenExpired: () => boolean
  isInstructor: () => boolean
  isAdmin: () => boolean
  hasPermission: (requiredRole: UserRole) => boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (data) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          isAuthenticated: true,
          error: null,
        })
      },

      setUser: (user) => {
        set({ user })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      logout: () => {
        set(initialState)
      },

      isTokenExpired: () => {
        const { expiresAt } = get()
        if (!expiresAt) return true
        return new Date(expiresAt) <= new Date()
      },

      isInstructor: () => {
        const { user } = get()
        return user?.role === 'instructor' || user?.role === 'admin'
      },

      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },

      hasPermission: (requiredRole: UserRole) => {
        const { user } = get()
        if (!user) return false

        const roleHierarchy: Record<UserRole, number> = {
          student: 1,
          instructor: 2,
          admin: 3,
        }

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// 导出便捷的选择器hooks
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAccessToken = () => useAuthStore((state) => state.accessToken)
export const useIsInstructor = () => useAuthStore((state) => state.isInstructor())
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin())
