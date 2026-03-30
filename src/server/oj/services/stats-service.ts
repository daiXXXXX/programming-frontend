import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { queryRows } from '@/server/oj/db'
import { ApiError, formatDate, json, parseId } from '@/server/oj/services/core'
import { requireCurrentUser } from '@/server/oj/services/user-service'

// 用户统计结构集中定义，方便统计接口与其他服务共享类型。
interface UserStatsRow extends RowDataPacket {
  userId: number
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSubmissions: number
  acceptedSubmissions: number
  todaySolved: number
  todayDate: Date | null
  updatedAt: Date
}

// 每日活动结构用于个人中心热力图展示。
interface DailyActivityRow extends RowDataPacket {
  userId: number
  activityDate: Date
  submissionCount: number
  solvedCount: number
}

// 统计服务负责个人统计与每日活跃数据接口。
export async function handleStatsRoutes(request: NextRequest, segments: string[]) {
  await requireCurrentUser(request)

  if (request.method === 'GET' && segments[0] === 'user' && segments[1] && !segments[2]) {
    const userId = parseId(segments[1], 'user ID')
    const rows = await queryRows<UserStatsRow[]>(
      `
        SELECT
          user_id AS userId,
          total_solved AS totalSolved,
          easy_solved AS easySolved,
          medium_solved AS mediumSolved,
          hard_solved AS hardSolved,
          total_submissions AS totalSubmissions,
          accepted_submissions AS acceptedSubmissions,
          today_solved AS todaySolved,
          today_date AS todayDate,
          updated_at AS updatedAt
        FROM user_stats
        WHERE user_id = ?
      `,
      [userId]
    )

    const stats = rows[0]
    if (!stats) {
      return json({
        userId,
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        totalSubmissions: 0,
        acceptedSubmissions: 0,
        successRate: 0,
      })
    }

    return json({
      userId: Number(stats.userId),
      totalSolved: Number(stats.totalSolved),
      easySolved: Number(stats.easySolved),
      mediumSolved: Number(stats.mediumSolved),
      hardSolved: Number(stats.hardSolved),
      totalSubmissions: Number(stats.totalSubmissions),
      acceptedSubmissions: Number(stats.acceptedSubmissions),
      todaySolved: Number(stats.todaySolved),
      todayDate: stats.todayDate ? formatDate(stats.todayDate) : undefined,
      successRate:
        Number(stats.totalSubmissions) > 0
          ? (Number(stats.acceptedSubmissions) / Number(stats.totalSubmissions)) * 100
          : 0,
    })
  }

  if (request.method === 'GET' && segments[0] === 'user' && segments[1] && segments[2] === 'activity') {
    const userId = parseId(segments[1], 'user ID')
    const end = request.nextUrl.searchParams.get('end') || formatDate(new Date())
    const start = request.nextUrl.searchParams.get('start') || formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))

    const rows = await queryRows<DailyActivityRow[]>(
      `
        SELECT
          user_id AS userId,
          activity_date AS activityDate,
          submission_count AS submissionCount,
          solved_count AS solvedCount
        FROM daily_activity
        WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?
        ORDER BY activity_date ASC
      `,
      [userId, start, end]
    )

    return json(
      rows.map((row) => ({
        userId: Number(row.userId),
        date: formatDate(row.activityDate),
        submissionCount: Number(row.submissionCount),
        solvedCount: Number(row.solvedCount),
      }))
    )
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
