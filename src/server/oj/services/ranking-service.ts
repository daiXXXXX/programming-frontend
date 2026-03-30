import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { queryRows } from '@/server/oj/db'
import { ApiError, json } from '@/server/oj/services/core'

// 排行榜查询结果结构集中定义，便于总榜和今日榜复用。
interface RankingRow extends RowDataPacket {
  userId: number
  username: string
  avatar: string
  totalSolved: number
  todaySolved: number
}

// 排行榜服务只负责公开榜单相关接口，保持逻辑边界清晰。
export async function handleRankingRoutes(request: NextRequest, segments: string[]) {
  if (request.method !== 'GET') {
    throw new ApiError(404, 'not_found', 'Route not found')
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '50'), 1), 100)

  if (segments[0] === 'total') {
    const rows = await queryRows<RankingRow[]>(
      `
        SELECT
          u.id AS userId,
          u.username,
          COALESCE(u.avatar, '') AS avatar,
          COALESCE(s.total_solved, 0) AS totalSolved,
          COALESCE(s.today_solved, 0) AS todaySolved
        FROM users u
        LEFT JOIN user_stats s ON u.id = s.user_id
        ORDER BY totalSolved DESC, u.id ASC
        LIMIT ?
      `,
      [limit]
    )

    return json(
      rows.map((row, index) => ({
        userId: Number(row.userId),
        username: row.username,
        avatar: row.avatar,
        totalSolved: Number(row.totalSolved),
        todaySolved: Number(row.todaySolved),
        rank: index + 1,
      }))
    )
  }

  if (segments[0] === 'today') {
    const rows = await queryRows<RankingRow[]>(
      `
        SELECT
          u.id AS userId,
          u.username,
          COALESCE(u.avatar, '') AS avatar,
          COALESCE(s.total_solved, 0) AS totalSolved,
          COALESCE(s.today_solved, 0) AS todaySolved
        FROM users u
        LEFT JOIN user_stats s ON u.id = s.user_id
        WHERE s.today_date = CURDATE()
        ORDER BY todaySolved DESC, u.id ASC
        LIMIT ?
      `,
      [limit]
    )

    return json(
      rows.map((row, index) => ({
        userId: Number(row.userId),
        username: row.username,
        avatar: row.avatar,
        totalSolved: Number(row.totalSolved),
        todaySolved: Number(row.todaySolved),
        rank: index + 1,
      }))
    )
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
