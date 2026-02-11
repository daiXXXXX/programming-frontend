'use client'

import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'
import { useAuthStore, User, UserRole } from '@/store/authStore'
import { authApi, AuthError, LoginRequest, RegisterRequest, ChangePasswordRequest } from '@/lib/auth-api'

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    setUser,
    setLoading,
    setError,
    logout: storeLogout,
    isTokenExpired,
    isInstructor,
    isAdmin,
    hasPermission,
  } = useAuthStore()

  const [initialized, setInitialized] = useState(false)

  // 初始化时检查Token有效性
  useEffect(() => {
    const checkAuth = async () => {
      if (!accessToken || !refreshToken) {
        setInitialized(true)
        return
      }

      // 如果Token过期，尝试刷新
      if (isTokenExpired()) {
        try {
          const response = await authApi.refresh(refreshToken)
          setAuth(response)
        } catch {
          storeLogout()
        }
      } else {
        // 验证Token有效性
        try {
          const currentUser = await authApi.getCurrentUser()
          setUser(currentUser)
        } catch {
          storeLogout()
        }
      }
      setInitialized(true)
    }

    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 登录
  const login = useCallback(async (data: LoginRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authApi.login(data)
      setAuth(response)
      message.success('登录成功')
      return response
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
      message.error(authError.message || '登录失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setAuth, setLoading, setError])

  // 注册
  const register = useCallback(async (data: RegisterRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authApi.register(data)
      setAuth(response)
      message.success('注册成功')
      return response
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message)
      message.error(authError.message || '注册失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setAuth, setLoading, setError])

  // 登出
  const logout = useCallback(() => {
    storeLogout()
    message.success('已退出登录')
  }, [storeLogout])

  // 修改密码
  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    setLoading(true)
    try {
      await authApi.changePassword(data)
      message.success('密码修改成功')
    } catch (err) {
      const authError = err as AuthError
      message.error(authError.message || '密码修改失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch {
      return null
    }
  }, [setUser])

  return {
    // 状态
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    initialized,

    // 操作
    login,
    register,
    logout,
    changePassword,
    refreshUser,

    // 权限检查
    isInstructor: isInstructor(),
    isAdmin: isAdmin(),
    hasPermission,
  }
}

// 角色显示名称
export const roleLabels: Record<UserRole, string> = {
  student: '学生',
  instructor: '教师',
  admin: '管理员',
}

// 获取角色显示名称
export function getRoleLabel(role: UserRole): string {
  return roleLabels[role] || role
}
