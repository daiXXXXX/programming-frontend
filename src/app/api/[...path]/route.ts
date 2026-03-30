import { NextRequest } from 'next/server'

import { handleAuthRoutes } from '@/server/oj/services/auth-service'
import { toErrorResponse, ApiError } from '@/server/oj/services/core'
import { handleProblemRoutes } from '@/server/oj/services/problem-service'
import { handleRankingRoutes } from '@/server/oj/services/ranking-service'
import { handleSolutionRoutes } from '@/server/oj/services/solution-service'
import { handleStatsRoutes } from '@/server/oj/services/stats-service'
import { handleSubmissionRoutes } from '@/server/oj/services/submission-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 入口文件只负责分发请求，让具体业务逻辑按服务拆分到独立文件中。
async function dispatch(request: NextRequest, pathSegments: string[]) {
  const [scope, ...segments] = pathSegments

  if (!scope) {
    throw new ApiError(404, 'not_found', 'Route not found')
  }

  switch (scope) {
    case 'auth':
      return handleAuthRoutes(request, segments)
    case 'problems':
      return handleProblemRoutes(request, segments)
    case 'submissions':
      return handleSubmissionRoutes(request, segments)
    case 'stats':
      return handleStatsRoutes(request, segments)
    case 'ranking':
      return handleRankingRoutes(request, segments)
    case 'solutions':
      return handleSolutionRoutes(request, segments)
    default:
      throw new ApiError(404, 'not_found', 'Route not found')
  }
}

// GET 请求统一从这里进入，再按业务域分发到对应服务文件。
export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    return await dispatch(request, context.params.path ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

// POST 请求统一从这里进入，再按业务域分发到对应服务文件。
export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    return await dispatch(request, context.params.path ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

// PUT 请求统一从这里进入，再按业务域分发到对应服务文件。
export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    return await dispatch(request, context.params.path ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

// DELETE 请求统一从这里进入，再按业务域分发到对应服务文件。
export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    return await dispatch(request, context.params.path ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}
