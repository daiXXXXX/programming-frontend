import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import {
  generateTokenPair,
  getBearerToken,
  isInstructorRole,
  verifyAccessToken,
  type AppUserRole,
} from '@/server/oj/auth'
import { pool, queryRows } from '@/server/oj/db'
import { ApiError, type Queryable, queryWith } from '@/server/oj/services/core'

// 用户查询结果结构集中定义，供认证、统计、题解等多个服务复用。
export interface UserRow extends RowDataPacket {
  id: number
  username: string
  email: string
  classId: number
  className: string
  passwordHash: string
  role: AppUserRole
  avatar: string
  bio: string
  createdAt: Date
  updatedAt: Date
}

// 按旧后端结构读取完整用户信息，多个服务会依赖同一份用户基础数据。
export async function getUserById(userId: number, executor: Queryable = pool) {
  const rows = await queryWith<UserRow[]>(
    executor,
    `
      SELECT
        u.id,
        u.username,
        u.email,
        COALESCE(cs.class_id, 0) AS classId,
        COALESCE(c.name, '') AS className,
        u.password_hash AS passwordHash,
        u.role,
        COALESCE(u.avatar, '') AS avatar,
        COALESCE(u.bio, '') AS bio,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt
      FROM users u
      LEFT JOIN class_students cs ON u.id = cs.student_id
      LEFT JOIN classes c ON cs.class_id = c.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId]
  )

  return rows[0] ?? null
}

// 用户名登录、重名检查等场景共用该查询逻辑。
export async function getUserByUsername(username: string, executor: Queryable = pool) {
  const rows = await queryWith<UserRow[]>(
    executor,
    `
      SELECT
        u.id,
        u.username,
        u.email,
        COALESCE(cs.class_id, 0) AS classId,
        COALESCE(c.name, '') AS className,
        u.password_hash AS passwordHash,
        u.role,
        COALESCE(u.avatar, '') AS avatar,
        COALESCE(u.bio, '') AS bio,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt
      FROM users u
      LEFT JOIN class_students cs ON u.id = cs.student_id
      LEFT JOIN classes c ON cs.class_id = c.id
      WHERE u.username = ?
      LIMIT 1
    `,
    [username]
  )

  return rows[0] ?? null
}

// 邮箱登录、邮箱唯一性检查等场景共用该查询逻辑。
export async function getUserByEmail(email: string, executor: Queryable = pool) {
  const rows = await queryWith<UserRow[]>(
    executor,
    `
      SELECT
        u.id,
        u.username,
        u.email,
        COALESCE(cs.class_id, 0) AS classId,
        COALESCE(c.name, '') AS className,
        u.password_hash AS passwordHash,
        u.role,
        COALESCE(u.avatar, '') AS avatar,
        COALESCE(u.bio, '') AS bio,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt
      FROM users u
      LEFT JOIN class_students cs ON u.id = cs.student_id
      LEFT JOIN classes c ON cs.class_id = c.id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email]
  )

  return rows[0] ?? null
}

// 注册与改资料时复用用户名唯一性检查。
export async function usernameExists(username: string) {
  const rows = await queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM users WHERE username = ?`, [username])
  return Number(rows[0]?.count ?? 0) > 0
}

// 注册与改资料时复用邮箱唯一性检查。
export async function emailExists(email: string) {
  const rows = await queryRows<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM users WHERE email = ?`, [email])
  return Number(rows[0]?.count ?? 0) > 0
}

// 统一返回前端真正需要的用户字段，隐藏密码等敏感信息。
export function toUserDto(user: UserRow) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    classId: Number(user.classId ?? 0),
    className: user.className ?? '',
    role: user.role,
    avatar: user.avatar ?? '',
    bio: user.bio ?? '',
    createdAt: new Date(user.createdAt).toISOString(),
  }
}

// 统一构造认证成功响应，保证登录、注册、刷新接口格式一致。
export function toAuthResponse(user: UserRow) {
  const tokens = generateTokenPair({
    userId: Number(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
  })

  return {
    user: toUserDto(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  }
}

// 从请求头中解析当前用户，供需要登录态的接口统一复用。
export async function getCurrentUser(request: NextRequest) {
  const token = getBearerToken(request)
  if (!token) {
    return null
  }

  try {
    const claims = verifyAccessToken(token)
    return await getUserById(Number(claims.userId))
  } catch {
    return null
  }
}

// 需要登录态的接口直接使用该方法获取用户，缺失时统一抛出 401。
export async function requireCurrentUser(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new ApiError(401, 'unauthorized', 'Not authenticated')
  }

  return user
}

// 需要教师/管理员权限的接口统一通过这里做校验。
export function requireInstructor(user: UserRow) {
  if (!isInstructorRole(user.role)) {
    throw new ApiError(403, 'forbidden', 'Instructor permission required')
  }
}

// 题解等公开接口只需要当前用户 ID 时，可以安全地退化为 0。
export async function getCurrentUserIdOrZero(request: NextRequest) {
  const user = await getCurrentUser(request)
  return Number(user?.id ?? 0)
}
