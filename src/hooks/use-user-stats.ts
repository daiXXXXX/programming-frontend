'use client'

import { useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'

// useUserStats 统一管理个人统计数据，保证页面显示的解题数与后端汇总口径一致。
export function useUserStats() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const user = useAuthStore((state) => state.user)
	const userStats = useAppStore((state) => state.userStats)
	const userStatsLoading = useAppStore((state) => state.userStatsLoading)
	const setUserStats = useAppStore((state) => state.setUserStats)
	const setUserStatsLoading = useAppStore((state) => state.setUserStatsLoading)

	const loadUserStats = useCallback(async () => {
		if (!isAuthenticated || !user?.id) {
			setUserStats(null)
			setUserStatsLoading(false)
			return null
		}

		try {
			setUserStatsLoading(true)
			const stats = await api.getUserStats(user.id)
			setUserStats(stats)
			return stats
		} catch (error) {
			console.error('Failed to load user stats:', error)
			return null
		} finally {
			setUserStatsLoading(false)
		}
	}, [isAuthenticated, setUserStats, setUserStatsLoading, user?.id])

	// 登录态丢失时立即清空统计，避免页面继续展示上一个用户的解题数。
	useEffect(() => {
		if (!isAuthenticated) {
			setUserStats(null)
			setUserStatsLoading(false)
		}
	}, [isAuthenticated, setUserStats, setUserStatsLoading])

	return {
		userStats,
		loading: userStatsLoading,
		loadUserStats,
	}
}