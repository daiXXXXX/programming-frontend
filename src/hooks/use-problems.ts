// 自定义 Hook：题目数据管理
// 使用 zustand store 进行状态管理

import { useCallback, useEffect } from 'react'
import { api, Problem } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { message } from 'antd'
import { useI18n } from './use-i18n'

export function useProblems() {
  const { t } = useI18n()
  const {
    problems,
    problemsLoading,
    problemsError,
    problemsLastFetch,
    setProblems,
    setProblemsLoading,
    setProblemsError,
    isCacheValid
  } = useAppStore()

  // 加载题目列表
  const loadProblems = useCallback(async (forceRefresh = false) => {
    // 如果缓存有效且不强制刷新，直接返回
    if (!forceRefresh && isCacheValid(problemsLastFetch) && problems.length > 0) {
      return problems
    }

    try {
      setProblemsLoading(true)
      setProblemsError(null)
      const data = await api.getProblems()
      setProblems(data || [])
      return data || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载题目失败'
      setProblemsError(errorMessage)
      message.error((t.messages as Record<string, string>)?.loadFailed || errorMessage)
      return []
    } finally {
      setProblemsLoading(false)
    }
  }, [problems, problemsLastFetch, setProblems, setProblemsLoading, setProblemsError, isCacheValid, t])

  // 获取单个题目
  const getProblem = useCallback((id: number): Problem | undefined => {
    return problems.find(p => p.id === id)
  }, [problems])

  // 初始加载
  useEffect(() => {
    if (problems.length === 0 && !problemsLoading) {
      loadProblems()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    problems,
    loading: problemsLoading,
    error: problemsError,
    loadProblems,
    getProblem,
    refresh: () => loadProblems(true)
  }
}
