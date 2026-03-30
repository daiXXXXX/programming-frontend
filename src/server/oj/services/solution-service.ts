import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { execute, queryRows, withTransaction } from '@/server/oj/db'
import { ApiError, executeWith, json, parseId, queryWith, readJsonBody } from '@/server/oj/services/core'
import { getCurrentUserIdOrZero, requireCurrentUser } from '@/server/oj/services/user-service'

// 题解查询结构集中定义，便于列表与详情接口共用同一组字段。
interface SolutionRow extends RowDataPacket {
  id: number
  problemId: number
  userId: number
  title: string
  content: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: Date
  updatedAt: Date
  authorId: number
  authorUsername: string
  authorAvatar: string
  liked: number | boolean
}

// 评论查询结构集中定义，便于评论列表与创建评论响应复用。
interface SolutionCommentRow extends RowDataPacket {
  id: number
  solutionId: number
  userId: number
  parentId: number | null
  content: string
  likeCount: number
  createdAt: Date
  updatedAt: Date
  authorId: number
  authorUsername: string
  authorAvatar: string
}

// 题解详情查询供题解详情接口和创建题解后的返回逻辑复用。
async function getSolutionById(solutionId: number, currentUserId: number) {
  const rows = await queryRows<SolutionRow[]>(
    `
      SELECT
        s.id,
        s.problem_id AS problemId,
        s.user_id AS userId,
        s.title,
        s.content,
        s.view_count AS viewCount,
        s.like_count AS likeCount,
        s.comment_count AS commentCount,
        s.created_at AS createdAt,
        s.updated_at AS updatedAt,
        u.id AS authorId,
        u.username AS authorUsername,
        COALESCE(u.avatar, '') AS authorAvatar,
        CASE WHEN sl.id IS NOT NULL THEN 1 ELSE 0 END AS liked
      FROM solutions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN solution_likes sl ON sl.solution_id = s.id AND sl.user_id = ?
      WHERE s.id = ?
      LIMIT 1
    `,
    [currentUserId, solutionId]
  )

  const row = rows[0]
  if (!row) {
    return null
  }

  return {
    id: Number(row.id),
    problemId: Number(row.problemId),
    userId: Number(row.userId),
    title: row.title,
    content: row.content,
    viewCount: Number(row.viewCount),
    likeCount: Number(row.likeCount),
    commentCount: Number(row.commentCount),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    author: {
      id: Number(row.authorId),
      username: row.authorUsername,
      avatar: row.authorAvatar,
    },
    liked: Boolean(row.liked),
  }
}

// 题解评论接口沿用原有嵌套结构，保证前端评论树无需改动。
async function getSolutionComments(solutionId: number, limit: number, offset: number) {
  const countRows = await queryRows<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM solution_comments WHERE solution_id = ? AND parent_id IS NULL`,
    [solutionId]
  )
  const total = Number(countRows[0]?.total ?? 0)

  const rows = await queryRows<SolutionCommentRow[]>(
    `
      SELECT
        c.id,
        c.solution_id AS solutionId,
        c.user_id AS userId,
        c.parent_id AS parentId,
        c.content,
        c.like_count AS likeCount,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        u.id AS authorId,
        u.username AS authorUsername,
        COALESCE(u.avatar, '') AS authorAvatar
      FROM solution_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.solution_id = ?
      ORDER BY c.created_at ASC
    `,
    [solutionId]
  )

  const commentMap = new Map<number, any>()
  const topLevelIds: number[] = []

  for (const row of rows) {
    const comment = {
      id: Number(row.id),
      solutionId: Number(row.solutionId),
      userId: Number(row.userId),
      ...(row.parentId ? { parentId: Number(row.parentId) } : {}),
      content: row.content,
      likeCount: Number(row.likeCount),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      author: {
        id: Number(row.authorId),
        username: row.authorUsername,
        avatar: row.authorAvatar,
      },
      replies: [] as any[],
    }

    commentMap.set(comment.id, comment)
    if (!row.parentId) {
      topLevelIds.push(comment.id)
    }
  }

  for (const comment of Array.from(commentMap.values())) {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId)
      if (parent) {
        parent.replies.push(comment)
      }
    }
  }

  const pagedIds = topLevelIds.slice(offset, offset + limit)
  const comments = pagedIds.map((id) => commentMap.get(id))

  return {
    comments,
    total,
    limit,
    offset,
  }
}

// 题解服务负责题解列表、详情、评论和点赞相关接口。
export async function handleSolutionRoutes(request: NextRequest, segments: string[]) {
  if (request.method === 'GET' && segments[0] === 'problem' && segments[1]) {
    const problemId = parseId(segments[1], 'problem ID')
    const currentUserId = await getCurrentUserIdOrZero(request)
    const order = request.nextUrl.searchParams.get('order') ?? 'newest'
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '20'), 1), 100)
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') ?? '0'), 0)

    const totalRows = await queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM solutions WHERE problem_id = ?`, [problemId])
    const total = Number(totalRows[0]?.total ?? 0)

    const orderClause =
      order === 'likes'
        ? 's.like_count DESC, s.created_at DESC'
        : order === 'views'
          ? 's.view_count DESC, s.created_at DESC'
          : order === 'oldest'
            ? 's.created_at ASC'
            : 's.created_at DESC'

    const rows = await queryRows<SolutionRow[]>(
      `
        SELECT
          s.id,
          s.problem_id AS problemId,
          s.user_id AS userId,
          s.title,
          s.content,
          s.view_count AS viewCount,
          s.like_count AS likeCount,
          s.comment_count AS commentCount,
          s.created_at AS createdAt,
          s.updated_at AS updatedAt,
          u.id AS authorId,
          u.username AS authorUsername,
          COALESCE(u.avatar, '') AS authorAvatar,
          CASE WHEN sl.id IS NOT NULL THEN 1 ELSE 0 END AS liked
        FROM solutions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN solution_likes sl ON sl.solution_id = s.id AND sl.user_id = ?
        WHERE s.problem_id = ?
        ORDER BY ${orderClause}
        LIMIT ? OFFSET ?
      `,
      [currentUserId, problemId, limit, offset]
    )

    return json({
      solutions: rows.map((row) => ({
        id: Number(row.id),
        problemId: Number(row.problemId),
        userId: Number(row.userId),
        title: row.title,
        content: row.content,
        viewCount: Number(row.viewCount),
        likeCount: Number(row.likeCount),
        commentCount: Number(row.commentCount),
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        author: {
          id: Number(row.authorId),
          username: row.authorUsername,
          avatar: row.authorAvatar,
        },
        liked: Boolean(row.liked),
      })),
      total,
      limit,
      offset,
    })
  }

  if (request.method === 'GET' && segments.length === 2 && segments[1] === 'comments') {
    const solutionId = parseId(segments[0], 'solution ID')
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '20'), 1), 100)
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') ?? '0'), 0)
    return json(await getSolutionComments(solutionId, limit, offset))
  }

  if (request.method === 'GET' && segments.length === 1) {
    const solutionId = parseId(segments[0], 'solution ID')
    const currentUserId = await getCurrentUserIdOrZero(request)
    const solution = await getSolutionById(solutionId, currentUserId)
    if (!solution) {
      throw new ApiError(404, 'not_found', 'Solution not found')
    }

    void execute(`UPDATE solutions SET view_count = view_count + 1 WHERE id = ?`, [solutionId])
    return json(solution)
  }

  if (request.method === 'POST' && segments.length === 0) {
    const currentUser = await requireCurrentUser(request)
    const body = await readJsonBody<{ problemId: number; title: string; content: string }>(request)
    const created = await execute(`INSERT INTO solutions (problem_id, user_id, title, content) VALUES (?, ?, ?, ?)`, [
      body.problemId,
      currentUser.id,
      body.title,
      body.content,
    ])

    const solution = await getSolutionById(Number(created.insertId), Number(currentUser.id))
    return json(solution, 201)
  }

  if (request.method === 'PUT' && segments.length === 1) {
    const currentUser = await requireCurrentUser(request)
    const solutionId = parseId(segments[0], 'solution ID')
    const body = await readJsonBody<{ title: string; content: string }>(request)
    const result = await execute(`UPDATE solutions SET title = ?, content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`, [
      body.title,
      body.content,
      solutionId,
      currentUser.id,
    ])

    if (result.affectedRows === 0) {
      throw new ApiError(403, 'forbidden', 'Solution not found or permission denied')
    }

    return json({ message: 'Solution updated' })
  }

  if (request.method === 'DELETE' && segments[0] === 'comments' && segments[1]) {
    const currentUser = await requireCurrentUser(request)
    const commentId = parseId(segments[1], 'comment ID')

    await withTransaction(async (connection) => {
      const rows = await queryWith<RowDataPacket[]>(
        connection,
        `SELECT solution_id AS solutionId, user_id AS userId FROM solution_comments WHERE id = ? LIMIT 1`,
        [commentId]
      )
      const comment = rows[0]
      if (!comment) {
        throw new ApiError(404, 'not_found', 'Comment not found')
      }
      if (currentUser.role !== 'instructor' && currentUser.role !== 'admin' && Number(comment.userId) !== Number(currentUser.id)) {
        throw new ApiError(403, 'forbidden', 'permission denied')
      }

      const countRows = await queryWith<RowDataPacket[]>(
        connection,
        `
          WITH RECURSIVE descendants AS (
            SELECT id FROM solution_comments WHERE id = ?
            UNION ALL
            SELECT c.id FROM solution_comments c INNER JOIN descendants d ON c.parent_id = d.id
          )
          SELECT COUNT(*) AS count FROM descendants
        `,
        [commentId]
      )
      const deleteCount = Number(countRows[0]?.count ?? 1)

      await executeWith(connection, `DELETE FROM solution_comments WHERE id = ?`, [commentId])
      await executeWith(connection, `UPDATE solutions SET comment_count = GREATEST(comment_count - ?, 0) WHERE id = ?`, [
        deleteCount,
        comment.solutionId,
      ])
    })

    return json({ message: 'Comment deleted' })
  }

  if (request.method === 'DELETE' && segments.length === 1) {
    const currentUser = await requireCurrentUser(request)
    const solutionId = parseId(segments[0], 'solution ID')
    const isManager = currentUser.role === 'instructor' || currentUser.role === 'admin'
    const result = await execute(
      isManager ? `DELETE FROM solutions WHERE id = ?` : `DELETE FROM solutions WHERE id = ? AND user_id = ?`,
      isManager ? [solutionId] : [solutionId, currentUser.id]
    )

    if (result.affectedRows === 0) {
      throw new ApiError(403, 'forbidden', 'Solution not found or permission denied')
    }

    return json({ message: 'Solution deleted' })
  }

  if (request.method === 'POST' && segments.length === 2 && segments[1] === 'like') {
    const currentUser = await requireCurrentUser(request)
    const solutionId = parseId(segments[0], 'solution ID')

    const result = await withTransaction(async (connection) => {
      const existingRows = await queryWith<RowDataPacket[]>(
        connection,
        `SELECT id FROM solution_likes WHERE solution_id = ? AND user_id = ? LIMIT 1`,
        [solutionId, currentUser.id]
      )

      let liked = false
      if (existingRows[0]) {
        await executeWith(connection, `DELETE FROM solution_likes WHERE id = ?`, [existingRows[0].id])
        await executeWith(connection, `UPDATE solutions SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?`, [solutionId])
      } else {
        liked = true
        await executeWith(connection, `INSERT INTO solution_likes (solution_id, user_id) VALUES (?, ?)`, [solutionId, currentUser.id])
        await executeWith(connection, `UPDATE solutions SET like_count = like_count + 1 WHERE id = ?`, [solutionId])
      }

      const rows = await queryWith<RowDataPacket[]>(connection, `SELECT like_count AS likeCount FROM solutions WHERE id = ?`, [solutionId])
      return {
        liked,
        likeCount: Number(rows[0]?.likeCount ?? 0),
      }
    })

    return json(result)
  }

  if (request.method === 'POST' && segments.length === 2 && segments[1] === 'comments') {
    const currentUser = await requireCurrentUser(request)
    const solutionId = parseId(segments[0], 'solution ID')
    const body = await readJsonBody<{ content: string; parentId?: number | null }>(request)
    if (!body.content?.trim()) {
      throw new ApiError(400, 'validation_error', 'Invalid request data')
    }

    const commentId = await withTransaction(async (connection) => {
      const created = await executeWith(
        connection,
        `INSERT INTO solution_comments (solution_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)`,
        [solutionId, currentUser.id, body.parentId ?? null, body.content]
      )
      await executeWith(connection, `UPDATE solutions SET comment_count = comment_count + 1 WHERE id = ?`, [solutionId])
      return Number(created.insertId)
    })

    const rows = await queryRows<SolutionCommentRow[]>(
      `
        SELECT
          c.id,
          c.solution_id AS solutionId,
          c.user_id AS userId,
          c.parent_id AS parentId,
          c.content,
          c.like_count AS likeCount,
          c.created_at AS createdAt,
          c.updated_at AS updatedAt,
          u.id AS authorId,
          u.username AS authorUsername,
          COALESCE(u.avatar, '') AS authorAvatar
        FROM solution_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `,
      [commentId]
    )

    const row = rows[0]
    return json(
      {
        id: Number(row.id),
        solutionId: Number(row.solutionId),
        userId: Number(row.userId),
        ...(row.parentId ? { parentId: Number(row.parentId) } : {}),
        content: row.content,
        likeCount: Number(row.likeCount),
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        author: {
          id: Number(row.authorId),
          username: row.authorUsername,
          avatar: row.authorAvatar,
        },
        replies: [],
      },
      201
    )
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
