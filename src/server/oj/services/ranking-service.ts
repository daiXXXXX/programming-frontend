import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { queryRows } from '@/server/oj/db'
import { getCachedJson, setCachedJson } from '@/server/oj/redis'
import { ApiError, json } from '@/server/oj/services/core'

// 排行榜查询结果结构集中定义，便于总榜和今日榜复用。
interface RankingRow extends RowDataPacket {
  userId: number
  username: string
  avatar: string
  totalSolved: number
  todaySolved: number
}

const TOTAL_RANKING_CACHE_TTL_SECONDS = 30
const TODAY_RANKING_CACHE_TTL_SECONDS = 15

function normalizeRanking(rows: RankingRow[]) {
  return rows.map((row, index) => ({
    userId: Number(row.userId),
    username: row.username,
    avatar: row.avatar,
    totalSolved: Number(row.totalSolved),
    todaySolved: Number(row.todaySolved),
    rank: index + 1,
  }))
}

// 排行榜服务只负责公开榜单相关接口，保持逻辑边界清晰。
export async function handleRankingRoutes(request: NextRequest, segments: string[]) {
  if (request.method !== 'GET') {
    throw new ApiError(404, 'not_found', 'Route not found')
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '50'), 1), 100)

  if (segments[0] === 'total') {
    // 总榜访问频率高，优先走 Redis 短 TTL 缓存，减少重复排序查询。
    const cachedRanking = await getCachedJson<ReturnType<typeof normalizeRanking>>('ranking', 'total', limit)
    if (cachedRanking) {
      return json(cachedRanking)
    }

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

    const ranking = normalizeRanking(rows)
    await setCachedJson(ranking, TOTAL_RANKING_CACHE_TTL_SECONDS, 'ranking', 'total', limit)
    return json(ranking)
  }

  if (segments[0] === 'today') {
    // 今日榜变化更频繁，因此缓存时间比总榜更短。
    const cachedRanking = await getCachedJson<ReturnType<typeof normalizeRanking>>('ranking', 'today', limit)
    if (cachedRanking) {
      return json(cachedRanking)
    }

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

    const ranking = normalizeRanking(rows)
    await setCachedJson(ranking, TODAY_RANKING_CACHE_TTL_SECONDS, 'ranking', 'today', limit)
    return json(ranking)
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
