import 'server-only'

import bcrypt from 'bcryptjs'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

// 统一约束系统内支持的用户角色，避免路由层散落硬编码字符串。
export type AppUserRole = 'student' | 'instructor' | 'admin'

export interface TokenUser {
  userId: number
  username: string
  email: string
  role: AppUserRole
}

interface AppTokenPayload extends JwtPayload, TokenUser {
  tokenType: 'access' | 'refresh'
}

const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET')
  }
  return secret
}

// 生成与旧 Go 后端结构兼容的 access/refresh token 对。
export function generateTokenPair(user: TokenUser) {
  const secret = getJwtSecret()
  const accessToken = jwt.sign({ ...user, tokenType: 'access' }, secret, { expiresIn: '7d' })
  const refreshToken = jwt.sign({ ...user, tokenType: 'refresh' }, secret, { expiresIn: '30d' })

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString(),
  }
}

function verifyToken(token: string, expectedType: 'access' | 'refresh'): TokenUser {
  const payload = jwt.verify(token, getJwtSecret())
  if (!payload || typeof payload === 'string') {
    throw new Error('Invalid token payload')
  }

  const claims = payload as AppTokenPayload
  if (claims.tokenType !== expectedType) {
    throw new Error('Invalid token type')
  }

  return {
    userId: Number(claims.userId),
    username: claims.username,
    email: claims.email,
    role: claims.role,
  }
}

// 校验 access token，供需要登录态的 API 读取当前用户信息。
export function verifyAccessToken(token: string) {
  return verifyToken(token, 'access')
}

// 校验 refresh token，用于刷新登录态。
export function verifyRefreshToken(token: string) {
  return verifyToken(token, 'refresh')
}

// 从请求头里提取 Bearer Token，便于 API 层复用。
export function getBearerToken(request: NextRequest | Request) {
  const header = request.headers.get('authorization')
  if (!header) {
    return null
  }

  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

// 密码哈希沿用 bcrypt，兼容原后端的存储方式。
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

// 登录与改密时使用 bcrypt 校验密码。
export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

// 用户名规则与旧后端保持一致，只允许字母、数字和下划线。
export function isValidUsername(username: string) {
  return /^[A-Za-z0-9_]{3,50}$/.test(username)
}

// 密码强度规则与原实现一致，先满足最小可用要求。
export function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,128}$/.test(password)
}

// 角色白名单限制注册与鉴权入参，避免写入非法角色值。
export function isValidRole(role: string): role is AppUserRole {
  return role === 'student' || role === 'instructor' || role === 'admin'
}

// 用于判断当前用户是否拥有教师级及以上权限。
export function isInstructorRole(role: AppUserRole) {
  return role === 'instructor' || role === 'admin'
}
