// 自定义 Hook：UI状态管理
// 使用 zustand store 管理 UI 相关状态

import { useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { Problem } from '@/lib/api'

type DifficultyFilter = 'All' | 'Easy' | 'Medium' | 'Hard'

export function useUIState() {
  const {
    activeTab,
    selectedProblemId,
    filterDifficulty,
    setActiveTab,
    setSelectedProblemId,
    setFilterDifficulty,
    problems
  } = useAppStore()

  // 切换标签页
  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [setActiveTab])

  // 选择题目
  const selectProblem = useCallback((problem: Problem | null) => {
    setSelectedProblemId(problem?.id ?? null)
    if (problem) {
      setActiveTab('problems')
    }
  }, [setSelectedProblemId, setActiveTab])

  // 获取当前选中的题目
  const getSelectedProblem = useCallback((): Problem | null => {
    if (!selectedProblemId) return null
    return problems.find(p => p.id === selectedProblemId) || null
  }, [selectedProblemId, problems])

  // 清除选中的题目
  const clearSelectedProblem = useCallback(() => {
    setSelectedProblemId(null)
  }, [setSelectedProblemId])

  // 设置难度筛选
  const setDifficultyFilter = useCallback((difficulty: DifficultyFilter) => {
    setFilterDifficulty(difficulty)
  }, [setFilterDifficulty])

  // 获取筛选后的题目
  const getFilteredProblems = useCallback((): Problem[] => {
    if (filterDifficulty === 'All') {
      return problems
    }
    return problems.filter(p => p.difficulty === filterDifficulty)
  }, [problems, filterDifficulty])

  return {
    activeTab,
    selectedProblemId,
    filterDifficulty,
    switchTab,
    selectProblem,
    getSelectedProblem,
    clearSelectedProblem,
    setDifficultyFilter,
    getFilteredProblems
  }
}
