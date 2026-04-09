// Zustand 全局缓存存储
// 用于管理应用级别的状态和本地缓存

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Problem, Submission, UserStats } from '@/lib/api'

// 应用状态接口
interface AppState {
  // 题目数据缓存
  problems: Problem[]
  problemsLoading: boolean
  problemsError: string | null
  problemsLastFetch: number | null
  
  // 提交记录缓存
  submissions: Submission[]
  submissionsLoading: boolean
  submissionsError: string | null
  submissionsLastFetch: number | null
  
  // 用户统计缓存
  userStats: UserStats | null
  userStatsLoading: boolean
  
  // UI 状态
  activeTab: string
  selectedProblemId: number | null
  filterDifficulty: 'All' | 'Easy' | 'Medium' | 'Hard'
  
  // Actions
  setProblems: (problems: Problem[]) => void
  setProblemsLoading: (loading: boolean) => void
  setProblemsError: (error: string | null) => void
  
  setSubmissions: (submissions: Submission[]) => void
  resetSubmissionsCache: () => void
  addSubmission: (submission: Submission) => void
  updateSubmission: (id: number, updates: Partial<Submission>) => void
  setSubmissionsLoading: (loading: boolean) => void
  setSubmissionsError: (error: string | null) => void
  
  setUserStats: (stats: UserStats | null) => void
  setUserStatsLoading: (loading: boolean) => void
  
  setActiveTab: (tab: string) => void
  setSelectedProblemId: (id: number | null) => void
  setFilterDifficulty: (difficulty: 'All' | 'Easy' | 'Medium' | 'Hard') => void
  
  // 缓存管理
  clearCache: () => void
  isCacheValid: (lastFetch: number | null, maxAge?: number) => boolean
}

// 默认缓存有效期：5分钟
const DEFAULT_CACHE_MAX_AGE = 5 * 60 * 1000

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      problems: [],
      problemsLoading: false,
      problemsError: null,
      problemsLastFetch: null,
      
      submissions: [],
      submissionsLoading: false,
      submissionsError: null,
      submissionsLastFetch: null,
      
      userStats: null,
      userStatsLoading: false,
      
      activeTab: 'dashboard',
      selectedProblemId: null,
      filterDifficulty: 'All',
      
      // Problems actions
      setProblems: (problems) => set({ 
        problems, 
        problemsLastFetch: Date.now(),
        problemsError: null 
      }),
      setProblemsLoading: (problemsLoading) => set({ problemsLoading }),
      setProblemsError: (problemsError) => set({ problemsError }),
      
      // Submissions actions
      setSubmissions: (submissions) => set({ 
        submissions,
        submissionsLastFetch: Date.now(),
        submissionsError: null
      }),
      // resetSubmissionsCache 用于退出登录或游客访问时清空个人提交态，避免刷新缓存时间戳导致循环更新。
      resetSubmissionsCache: () => set((state) => {
        // 已经是游客态空缓存时直接复用旧状态，避免无意义更新导致组件重复渲染。
        if (
          state.submissions.length === 0 &&
          !state.submissionsLoading &&
          state.submissionsError === null &&
          state.submissionsLastFetch === null
        ) {
          return state
        }

        return {
          submissions: [],
          submissionsLoading: false,
          submissionsError: null,
          submissionsLastFetch: null,
        }
      }),
      addSubmission: (submission) => set((state) => ({
        submissions: [submission, ...state.submissions]
      })),
      updateSubmission: (id, updates) => set((state) => ({
        submissions: state.submissions.map(s => 
          s.id === id ? { ...s, ...updates } : s
        )
      })),
      setSubmissionsLoading: (submissionsLoading) => set({ submissionsLoading }),
      setSubmissionsError: (submissionsError) => set({ submissionsError }),
      
      // User stats actions
      setUserStats: (userStats) => set({ userStats }),
      setUserStatsLoading: (userStatsLoading) => set({ userStatsLoading }),
      
      // UI actions
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedProblemId: (selectedProblemId) => set({ selectedProblemId }),
      setFilterDifficulty: (filterDifficulty) => set({ filterDifficulty }),
      
      // 缓存管理
      clearCache: () => set({
        problems: [],
        problemsLastFetch: null,
        submissions: [],
        submissionsLastFetch: null,
        userStats: null
      }),
      
      isCacheValid: (lastFetch, maxAge = DEFAULT_CACHE_MAX_AGE) => {
        if (!lastFetch) return false
        return Date.now() - lastFetch < maxAge
      }
    }),
    {
      name: 'programming-platform-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分状态
      partialize: (state) => ({
        problems: state.problems,
        problemsLastFetch: state.problemsLastFetch,
        submissions: state.submissions,
        submissionsLastFetch: state.submissionsLastFetch,
        activeTab: state.activeTab,
        filterDifficulty: state.filterDifficulty
      })
    }
  )
)

// 选择器 hooks，用于优化重渲染
export const useProblems = () => useAppStore((state) => state.problems)
export const useProblemsLoading = () => useAppStore((state) => state.problemsLoading)
export const useSubmissions = () => useAppStore((state) => state.submissions)
export const useSubmissionsLoading = () => useAppStore((state) => state.submissionsLoading)
export const useActiveTab = () => useAppStore((state) => state.activeTab)
export const useFilterDifficulty = () => useAppStore((state) => state.filterDifficulty)
export const useSelectedProblemId = () => useAppStore((state) => state.selectedProblemId)
