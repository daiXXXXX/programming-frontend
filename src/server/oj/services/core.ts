import 'server-only'

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { NextRequest, NextResponse } from 'next/server'

import { pool, type DBConnection } from '@/server/oj/db'

// 所有服务共用的数据库执行器类型，既支持连接池也支持事务连接。
export type Queryable = typeof pool | DBConnection

// 统一 API 错误结构，保证拆分服务文件后仍然返回相同的错误格式。
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 统一 JSON 响应构造，避免每个服务文件重复拼装 `NextResponse`。
export function json(data: unknown, init?: number | ResponseInit) {
  if (typeof init === 'number') {
    return NextResponse.json(data, { status: init })
  }

  return NextResponse.json(data, init)
}

// 统一错误出口，保证拆分后依然与原接口错误结构兼容。
export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      {
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      error.status
    )
  }

  console.error('[next-api]', error)
  return json(
    {
      error: 'server_error',
      message: 'Internal server error',
    },
    500
  )
}

// 统一读取 JSON 请求体，避免每个路由处理器重复捕获解析异常。
export async function readJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError(400, 'validation_error', 'Invalid request data')
  }
}

// 统一校验主键类参数，避免不同服务出现不一致的 ID 解析行为。
export function parseId(value: string | undefined, label: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, 'validation_error', `Invalid ${label}`)
  }

  return id
}

// 日期格式统一按前端当前需要的 `yyyy-mm-dd` 输出。
export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return ''
  }

  const target = typeof date === 'string' ? new Date(date) : date
  return target.toISOString().slice(0, 10)
}

// 统一邮箱归一化逻辑，避免用户名/邮箱查找出现大小写不一致问题。
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// 保持与旧后端一致的邮箱格式校验规则。
export function ensureEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'validation_error', 'Invalid email address')
  }
}

// 为事务和普通查询都提供统一的查询封装。
export async function queryWith<T extends RowDataPacket[]>(executor: Queryable, sql: string, params: unknown[] = []) {
  const [rows] = await executor.query<T>(sql, params)
  return rows
}

// 为事务和普通执行都提供统一的写操作封装。
export async function executeWith(executor: Queryable, sql: string, params: unknown[] = []) {
  const [result] = await executor.execute<ResultSetHeader>(sql, params as any[])
  return result
}
