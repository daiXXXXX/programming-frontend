'use client'

import { useMemo } from 'react'
import { Typography, Tooltip } from 'antd'
import { useI18n } from '@/hooks/use-i18n'
import { DailyActivity } from '@/lib/api'

const { Text } = Typography

interface ContributionWallProps {
  activities: DailyActivity[]
  loading?: boolean
}

// 颜色等级 (类似 GitHub 的绿墙配色)
const LEVEL_COLORS = [
  '#ebedf0', // 0: 无活动
  '#9be9a8', // 1: 少量
  '#40c463', // 2: 中等
  '#30a14e', // 3: 较多
  '#216e39', // 4: 大量
]

const CELL_SIZE = 13
const CELL_GAP = 3
const CELL_TOTAL = CELL_SIZE + CELL_GAP

const WEEKDAYS = ['Mon', 'Wed', 'Fri']
const WEEKDAYS_ZH = ['一', '三', '五']

function getLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getMonthLabel(date: Date, lang: string): string {
  if (lang === 'zh') {
    return `${date.getMonth() + 1}月`
  }
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export function ContributionWall({ activities, loading }: ContributionWallProps) {
  const { t, language: lang } = useI18n()

  // 构建日期 -> 活动数据映射
  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivity>()
    activities.forEach((a) => {
      map.set(a.date, a)
    })
    return map
  }, [activities])

  // 生成过去一年的周数据（类似 GitHub 53 列 x 7 行）
  const { weeks, monthLabels, totalSubmissions, totalSolved, maxStreak, currentStreak } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 回退到一年前的周日
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364)
    // 对齐到周日
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    const weeks: { date: Date; dateStr: string; count: number; submissions: number }[][] = []
    const monthLabels: { label: string; col: number }[] = []

    let currentDate = new Date(startDate)
    let weekIndex = 0
    let lastMonth = -1
    let totalSubmissions = 0
    let totalSolved = 0

    while (currentDate <= today) {
      const week: { date: Date; dateStr: string; count: number; submissions: number }[] = []

      for (let day = 0; day < 7; day++) {
        const dateStr = formatDate(currentDate)
        const activity = activityMap.get(dateStr)
        const count = activity?.solvedCount || 0
        const submissions = activity?.submissionCount || 0

        if (currentDate <= today) {
          week.push({
            date: new Date(currentDate),
            dateStr,
            count,
            submissions,
          })
          totalSubmissions += submissions
          totalSolved += count
        } else {
          week.push({
            date: new Date(currentDate),
            dateStr,
            count: -1, // 未来日期标记
            submissions: 0,
          })
        }

        // 记录月份标签
        const month = currentDate.getMonth()
        if (month !== lastMonth && day === 0) {
          monthLabels.push({
            label: getMonthLabel(currentDate, lang),
            col: weekIndex,
          })
          lastMonth = month
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      weeks.push(week)
      weekIndex++
    }

    // 计算连续天数
    let maxStreak = 0
    let currentStreak = 0
    let tempStreak = 0

    const checkDate = new Date(startDate)
    while (checkDate <= today) {
      const dateStr = formatDate(checkDate)
      const activity = activityMap.get(dateStr)
      if (activity && activity.solvedCount > 0) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 0
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }

    // 当前连续天数（从今天往回数）
    currentStreak = 0
    const checkBack = new Date(today)
    while (true) {
      const dateStr = formatDate(checkBack)
      const activity = activityMap.get(dateStr)
      if (activity && activity.solvedCount > 0) {
        currentStreak++
        checkBack.setDate(checkBack.getDate() - 1)
      } else {
        break
      }
    }

    return { weeks, monthLabels, totalSubmissions, totalSolved, maxStreak, currentStreak }
  }, [activityMap, lang])

  const weekdayLabels = lang === 'zh' ? WEEKDAYS_ZH : WEEKDAYS

  const svgWidth = weeks.length * CELL_TOTAL + 30
  const svgHeight = 7 * CELL_TOTAL + 30

  if (loading) {
    return (
      <div style={{ 
        background: '#fff', 
        borderRadius: 12, 
        padding: 24,
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text type="secondary">{t('common.loading')}</Text>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px' }}>
      {/* Summary stats */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('profile.wall.totalSubmissions')}
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#24292f' }}>
            {totalSubmissions}
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('profile.wall.totalSolved')}
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1a7f37' }}>
            {totalSolved}
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('profile.wall.maxStreak')}
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#cf222e' }}>
            {maxStreak} {t('profile.wall.days')}
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('profile.wall.currentStreak')}
          </Text>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#8250df' }}>
            {currentStreak} {t('profile.wall.days')}
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div style={{ overflowX: 'auto' }}>
        <svg width={svgWidth} height={svgHeight + 20} style={{ display: 'block' }}>
          {/* Month labels */}
          {monthLabels.map(({ label, col }, i) => (
            <text
              key={i}
              x={col * CELL_TOTAL + 30}
              y={10}
              fontSize={11}
              fill="#57606a"
              fontFamily="var(--font-sans), -apple-system, sans-serif"
            >
              {label}
            </text>
          ))}

          {/* Weekday labels */}
          {weekdayLabels.map((label, i) => (
            <text
              key={label}
              x={0}
              y={20 + (i * 2 + 1) * CELL_TOTAL + CELL_SIZE / 2 + 4}
              fontSize={10}
              fill="#57606a"
              fontFamily="var(--font-sans), -apple-system, sans-serif"
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (day.count < 0) return null
              const level = getLevel(day.count)
              const color = LEVEL_COLORS[level]
              const x = wi * CELL_TOTAL + 30
              const y = di * CELL_TOTAL + 20

              const tooltipText = day.count > 0
                ? `${day.dateStr}: ${day.count} ${lang === 'zh' ? '题解决' : 'solved'}, ${day.submissions} ${lang === 'zh' ? '次提交' : 'submissions'}`
                : `${day.dateStr}: ${lang === 'zh' ? '无活动' : 'No activity'}`

              return (
                <Tooltip key={`${wi}-${di}`} title={tooltipText}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    ry={2}
                    fill={color}
                    style={{ 
                      outline: '1px solid rgba(27, 31, 36, 0.06)',
                      cursor: 'pointer',
                    }}
                  />
                </Tooltip>
              )
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 8,
      }}>
        <Text type="secondary" style={{ fontSize: 11, marginRight: 4 }}>
          {t('profile.wall.less')}
        </Text>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: color,
              outline: '1px solid rgba(27, 31, 36, 0.06)',
            }}
          />
        ))}
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
          {t('profile.wall.more')}
        </Text>
      </div>
    </div>
  )
}
