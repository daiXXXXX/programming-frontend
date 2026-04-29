'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, DailyProblemRecommendation } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'

export function useDailyProblemRecommendation() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const acceptedProblemSignature = useAppStore((state) =>
    Array.from(
      new Set(
        state.submissions
          .filter((submission) => submission.status === 'Accepted')
          .map((submission) => submission.problemId)
      )
    )
      .sort((a, b) => a - b)
      .join(',')
  )
  const [recommendation, setRecommendation] = useState<DailyProblemRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecommendation = useCallback(async () => {
    if (!isAuthenticated) {
      setRecommendation(null)
      setError(null)
      setLoading(false)
      return null
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.getDailyProblemRecommendation()
      setRecommendation(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载每日一题失败'
      setError(errorMessage)
      setRecommendation(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Accepted 题目集合变化后重新请求，避免刚 AC 的题目继续留在每日一题入口。
  useEffect(() => {
    void loadRecommendation()
  }, [loadRecommendation, acceptedProblemSignature])

  return {
    recommendation,
    loading,
    error,
    refresh: loadRecommendation,
  }
}
