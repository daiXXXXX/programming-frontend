import 'server-only'

import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { NextRequest } from 'next/server'

import {
  hashPassword,
  isStrongPassword,
  isValidRole,
  isValidUsername,
  verifyPassword,
  verifyRefreshToken,
} from '@/server/oj/auth'
import { execute } from '@/server/oj/db'
import { ApiError, ensureEmail, json, normalizeEmail, readJsonBody } from '@/server/oj/services/core'
import {
  emailExists,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  requireCurrentUser,
  toAuthResponse,
  toUserDto,
} from '@/server/oj/services/user-service'
import { usernameExists } from './user-service'

// 认证服务负责注册、登录、刷新和个人信息维护等接口逻辑。
export async function handleAuthRoutes(request: NextRequest, segments: string[]) {
  const [resource] = segments

  if (request.method === 'POST' && resource === 'register') {
    const body = await readJsonBody<{ username: string; email: string; password: string; role?: string }>(request)
    if (!isValidUsername(body.username ?? '')) {
      throw new ApiError(400, 'invalid_username', 'Username can only contain letters, numbers, and underscores')
    }
    ensureEmail(body.email ?? '')
    if (!isStrongPassword(body.password ?? '')) {
      throw new ApiError(400, 'weak_password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    }

    const role = body.role && isValidRole(body.role) ? body.role : 'student'
    if (body.role && !isValidRole(body.role)) {
      throw new ApiError(400, 'invalid_role', 'Invalid role specified')
    }

    if (await usernameExists(body.username)) {
      throw new ApiError(409, 'username_exists', 'Username already taken')
    }

    const email = normalizeEmail(body.email)
    if (await emailExists(email)) {
      throw new ApiError(409, 'email_exists', 'Email already registered')
    }

    const passwordHash = await hashPassword(body.password)
    const result = await execute(
      `INSERT INTO users (username, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [body.username, email, passwordHash, role]
    )

    const user = await getUserById(Number(result.insertId))
    if (!user) {
      throw new ApiError(500, 'server_error', 'Failed to create user')
    }

    return json(toAuthResponse(user), 201)
  }

  if (request.method === 'POST' && resource === 'login') {
    const body = await readJsonBody<{ username: string; password: string }>(request)
    if (!body.username || !body.password) {
      throw new ApiError(400, 'validation_error', 'Invalid request data')
    }

    const user = body.username.includes('@')
      ? await getUserByEmail(normalizeEmail(body.username))
      : await getUserByUsername(body.username)

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, 'invalid_credentials', 'Invalid username or password')
    }

    return json(toAuthResponse(user))
  }

  if (request.method === 'POST' && resource === 'refresh') {
    const body = await readJsonBody<{ refreshToken: string }>(request)
    if (!body.refreshToken) {
      throw new ApiError(400, 'validation_error', 'Invalid request data')
    }

    const claims = verifyRefreshToken(body.refreshToken)
    const user = await getUserById(Number(claims.userId))
    if (!user) {
      throw new ApiError(401, 'user_not_found', 'User no longer exists')
    }

    return json(toAuthResponse(user))
  }

  if (request.method === 'GET' && resource === 'me') {
    const user = await requireCurrentUser(request)
    return json(toUserDto(user))
  }

  if (request.method === 'PUT' && resource === 'password') {
    const user = await requireCurrentUser(request)
    const body = await readJsonBody<{ oldPassword: string; newPassword: string }>(request)

    if (!(await verifyPassword(body.oldPassword ?? '', user.passwordHash))) {
      throw new ApiError(401, 'invalid_password', 'Current password is incorrect')
    }
    if (!isStrongPassword(body.newPassword ?? '')) {
      throw new ApiError(400, 'weak_password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    }

    const passwordHash = await hashPassword(body.newPassword)
    await execute(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`, [passwordHash, user.id])
    return json({ message: 'Password updated successfully' })
  }

  if (request.method === 'PUT' && resource === 'profile') {
    const user = await requireCurrentUser(request)
    const body = await readJsonBody<{ username: string; email: string; avatar?: string; bio?: string }>(request)

    if (!isValidUsername(body.username ?? '')) {
      throw new ApiError(400, 'invalid_username', 'Username can only contain letters, numbers, and underscores')
    }
    ensureEmail(body.email ?? '')

    const email = normalizeEmail(body.email)
    const otherByUsername = await getUserByUsername(body.username)
    if (otherByUsername && Number(otherByUsername.id) !== Number(user.id)) {
      throw new ApiError(409, 'username_exists', 'Username already taken')
    }
    const otherByEmail = await getUserByEmail(email)
    if (otherByEmail && Number(otherByEmail.id) !== Number(user.id)) {
      throw new ApiError(409, 'email_exists', 'Email already registered')
    }

    await execute(
      `UPDATE users SET username = ?, email = ?, avatar = ?, bio = ?, updated_at = NOW() WHERE id = ?`,
      [body.username, email, body.avatar ?? '', body.bio ?? '', user.id]
    )

    const updatedUser = await getUserById(Number(user.id))
    if (!updatedUser) {
      throw new ApiError(500, 'server_error', 'Failed to retrieve updated profile')
    }

    return json(toUserDto(updatedUser))
  }

  if (request.method === 'POST' && resource === 'avatar') {
    const user = await requireCurrentUser(request)
    const formData = await request.formData()
    const file = formData.get('avatar')
    if (!(file instanceof File)) {
      throw new ApiError(400, 'no_file', 'No avatar file uploaded')
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new ApiError(400, 'file_too_large', 'Avatar file size must be less than 2MB')
    }

    const ext = path.extname(file.name).toLowerCase()
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
    if (!allowedExts.has(ext)) {
      throw new ApiError(400, 'invalid_file_type', 'Only jpg, jpeg, png, gif, webp files are allowed')
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    await fs.mkdir(uploadDir, { recursive: true })

    const filename = `${user.id}_${randomUUID()}${ext}`
    const filePath = path.join(uploadDir, filename)
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(arrayBuffer))

    if (user.avatar?.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), 'public', user.avatar.replace(/^\//, ''))
      await fs.unlink(oldPath).catch(() => undefined)
    }

    const avatar = `/uploads/avatars/${filename}`
    await execute(`UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?`, [avatar, user.id])

    return json({ avatar, message: 'Avatar uploaded successfully' })
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
