// 自定义 Hook：提交记录管理
// 使用 zustand store 进行状态管理

import { useCallback, useEffect } from 'react'
import { api, Submission, SubmitCodeRequest } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { message } from 'antd'
import { useI18n } from './use-i18n'

export function useSubmissions() {
  const { t } = useI18n()
  const {
    submissions,
    submissionsLoading,
    submissionsError,
    submissionsLastFetch,
    setSubmissions,
    addSubmission,
    updateSubmission,
    setSubmissionsLoading,
    setSubmissionsError,
    isCacheValid
  } = useAppStore()

  // 加载提交记录
  const loadSubmissions = useCallback(async (forceRefresh = false) => {
    // 如果缓存有效且不强制刷新，直接返回
    if (!forceRefresh && isCacheValid(submissionsLastFetch) && submissions.length > 0) {
      return submissions
    }

    try {
      setSubmissionsLoading(true)
      setSubmissionsError(null)
      const data = await api.getUserSubmissions()
      setSubmissions(data || [])
      return data || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载提交记录失败'
      setSubmissionsError(errorMessage)
      console.error('Failed to load submissions:', error)
      return []
    } finally {
      setSubmissionsLoading(false)
    }
  }, [submissions, submissionsLastFetch, setSubmissions, setSubmissionsLoading, setSubmissionsError, isCacheValid])

  // 提交代码
  const submitCode = useCallback(async (data: SubmitCodeRequest): Promise<Submission | null> => {
    if (!data.code?.trim()) {
      message.error(t('messages.writeCodeFirst'))
      return null
    }

    try {
      setSubmissionsLoading(true)
      const submission = await api.submitCode({
        ...data,
        language: data.language || 'JavaScript'
      })

      // 添加到本地状态
      addSubmission(submission)

      // 根据状态显示不同的消息
      if (submission.status === 'Pending') {
        // 异步评测模式：提示用户等待
        message.info(t('messages.judging'))
      } else if (submission.status === 'Accepted') {
        message.success(`✓ ${t('messages.allTestsPassed')} ${t('history.score')}: ${submission.score}%`)
      } else if (submission.status === 'Runtime Error') {
        message.error(`✗ ${t('messages.runtimeError')}`)
      } else {
        const passedCount = submission.testResults?.filter(r => r.passed).length || 0
        const totalCount = submission.testResults?.length || 0
        message.error(`✗ ${t('messages.wrongAnswer')} ${passedCount}/${totalCount} ${t('messages.testsPassed')}`)
      }

      return submission
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '提交失败'
      message.error(errorMessage)
      return null
    } finally {
      setSubmissionsLoading(false)
    }
  }, [t, addSubmission, setSubmissionsLoading])

  // 获取已解决的题目ID集合
  const getSolvedProblemIds = useCallback((): Set<number> => {
    return new Set(
      (submissions || [])
        .filter(s => s.status === 'Accepted')
        .map(s => s.problemId)
    )
  }, [submissions])

  // 获取某道题的提交记录
  const getProblemSubmissions = useCallback((problemId: number): Submission[] => {
    return (submissions || []).filter(s => s.problemId === problemId)
  }, [submissions])

  // 初始加载
  useEffect(() => {
    if (submissions.length === 0 && !submissionsLoading) {
      loadSubmissions()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
    loadSubmissions,
    submitCode,
    updateSubmission,
    getSolvedProblemIds,
    getProblemSubmissions,
    refresh: () => loadSubmissions(true)
  }
}
