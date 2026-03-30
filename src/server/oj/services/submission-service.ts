import 'server-only'

import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { queryRows, withTransaction } from '@/server/oj/db'
import { calculateScore, evaluateCode, getSubmissionStatus } from '@/server/oj/evaluator'
import { ApiError, executeWith, json, parseId, readJsonBody } from '@/server/oj/services/core'
import { getProblemById } from '@/server/oj/services/problem-service'
import { requireCurrentUser } from '@/server/oj/services/user-service'

// 提交记录结构集中定义，便于提交接口与统计接口共享返回格式。
export interface SubmissionRow extends RowDataPacket {
  id: number
  problemId: number
  userId: number
  code: string
  language: string
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Pending'
  score: number
  submittedAt: Date
}

interface TestResultRow extends RowDataPacket {
  id: number
  testCaseId: number
  passed: number | boolean
  actualOutput: string | null
  error: string | null
  executionTime: number | null
  input: string
  expectedOutput: string
}

// 读取提交对应的测试结果，供详情和列表接口复用。
async function getSubmissionTestResults(submissionId: number) {
  const rows = await queryRows<TestResultRow[]>(
    `
      SELECT
        tr.id,
        tr.test_case_id AS testCaseId,
        tr.passed,
        tr.actual_output AS actualOutput,
        tr.error_message AS error,
        tr.execution_time AS executionTime,
        tc.input,
        tc.expected_output AS expectedOutput
      FROM test_results tr
      JOIN test_cases tc ON tr.test_case_id = tc.id
      WHERE tr.submission_id = ?
      ORDER BY tr.id
    `,
    [submissionId]
  )

  return rows.map((row) => ({
    testCaseId: Number(row.testCaseId),
    passed: Boolean(row.passed),
    input: row.input,
    expectedOutput: row.expectedOutput,
    ...(row.actualOutput ? { actualOutput: row.actualOutput } : {}),
    ...(row.error ? { error: row.error } : {}),
    ...(row.executionTime !== null && row.executionTime !== undefined ? { executionTime: Number(row.executionTime) } : {}),
  }))
}

// 统一组装提交响应结构，保证单条查询与列表查询返回一致。
export async function hydrateSubmission(submission: SubmissionRow) {
  const testResults = await getSubmissionTestResults(Number(submission.id))
  return {
    id: Number(submission.id),
    problemId: Number(submission.problemId),
    userId: Number(submission.userId),
    code: submission.code,
    language: submission.language,
    status: submission.status,
    score: Number(submission.score),
    testResults,
    submittedAt: new Date(submission.submittedAt).toISOString(),
  }
}

// 提交成功后同步刷新统计表，保持排行与个人中心数据立即可用。
export async function updateUserStats(connection: PoolConnection, userId: number) {
  await connection.execute(
    `
      INSERT INTO user_stats (
        user_id,
        total_solved,
        easy_solved,
        medium_solved,
        hard_solved,
        total_submissions,
        accepted_submissions,
        today_solved,
        today_date
      )
      SELECT
        ?,
        (SELECT COUNT(DISTINCT s.problem_id) FROM submissions s WHERE s.user_id = ? AND s.status = 'Accepted'),
        (SELECT COUNT(DISTINCT s.problem_id) FROM submissions s JOIN problems p ON s.problem_id = p.id WHERE s.user_id = ? AND s.status = 'Accepted' AND p.difficulty = 'Easy'),
        (SELECT COUNT(DISTINCT s.problem_id) FROM submissions s JOIN problems p ON s.problem_id = p.id WHERE s.user_id = ? AND s.status = 'Accepted' AND p.difficulty = 'Medium'),
        (SELECT COUNT(DISTINCT s.problem_id) FROM submissions s JOIN problems p ON s.problem_id = p.id WHERE s.user_id = ? AND s.status = 'Accepted' AND p.difficulty = 'Hard'),
        (SELECT COUNT(*) FROM submissions WHERE user_id = ?),
        (SELECT COUNT(*) FROM submissions WHERE user_id = ? AND status = 'Accepted'),
        (SELECT COUNT(DISTINCT s.problem_id) FROM submissions s WHERE s.user_id = ? AND s.status = 'Accepted' AND DATE(s.submitted_at) = CURDATE()),
        CURDATE()
      ON DUPLICATE KEY UPDATE
        total_solved = VALUES(total_solved),
        easy_solved = VALUES(easy_solved),
        medium_solved = VALUES(medium_solved),
        hard_solved = VALUES(hard_solved),
        total_submissions = VALUES(total_submissions),
        accepted_submissions = VALUES(accepted_submissions),
        today_solved = VALUES(today_solved),
        today_date = CURDATE(),
        updated_at = CURRENT_TIMESTAMP
    `,
    [userId, userId, userId, userId, userId, userId, userId, userId] as any[]
  )
}

// 更新每日活动统计，保证个人中心热力图数据可以同步展示。
export async function updateDailyActivity(connection: PoolConnection, userId: number) {
  await connection.execute(
    `
      INSERT INTO daily_activity (user_id, activity_date, submission_count, solved_count)
      SELECT
        ?,
        CURDATE(),
        (SELECT COUNT(*) FROM submissions WHERE user_id = ? AND DATE(submitted_at) = CURDATE()),
        (SELECT COUNT(DISTINCT problem_id) FROM submissions WHERE user_id = ? AND status = 'Accepted' AND DATE(submitted_at) = CURDATE())
      ON DUPLICATE KEY UPDATE
        submission_count = VALUES(submission_count),
        solved_count = VALUES(solved_count),
        updated_at = CURRENT_TIMESTAMP
    `,
    [userId, userId, userId] as any[]
  )
}

// 提交服务负责代码提交、提交详情和提交历史查询等接口。
export async function handleSubmissionRoutes(request: NextRequest, segments: string[]) {
  if (request.method === 'POST' && segments.length === 0) {
    const currentUser = await requireCurrentUser(request)
    const body = await readJsonBody<{ problemId: number; code: string; language?: string }>(request)
    const problemId = Number(body.problemId)
    if (!problemId || !body.code?.trim()) {
      throw new ApiError(400, 'validation_error', 'Invalid request data')
    }

    const problem = await getProblemById(problemId, true)
    if (!problem) {
      throw new ApiError(404, 'not_found', 'Problem not found')
    }

    const results = evaluateCode(
      body.code,
      body.language,
      problem.testCases.map((item) => ({
        id: Number(item.id),
        input: item.input,
        expectedOutput: item.expectedOutput,
      }))
    )
    const score = calculateScore(results)
    const status = getSubmissionStatus(results)

    const submissionId = await withTransaction(async (connection) => {
      const created = await executeWith(
        connection,
        `INSERT INTO submissions (problem_id, user_id, code, language, status, score) VALUES (?, ?, ?, ?, ?, ?)`,
        [problemId, currentUser.id, body.code, body.language || 'JavaScript', status, score]
      )

      const createdId = Number(created.insertId)
      for (const result of results) {
        await executeWith(
          connection,
          `
            INSERT INTO test_results (submission_id, test_case_id, passed, actual_output, error_message, execution_time)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [createdId, result.testCaseId, result.passed ? 1 : 0, result.actualOutput ?? null, result.error ?? null, result.executionTime ?? null]
        )
      }

      await updateUserStats(connection, Number(currentUser.id))
      await updateDailyActivity(connection, Number(currentUser.id))
      return createdId
    })

    const rows = await queryRows<SubmissionRow[]>(
      `
        SELECT id, problem_id AS problemId, user_id AS userId, code, language, status, score, submitted_at AS submittedAt
        FROM submissions
        WHERE id = ?
      `,
      [submissionId]
    )

    return json(await hydrateSubmission(rows[0]), 201)
  }

  if (request.method === 'GET' && segments[0] === 'user' && segments[1]) {
    await requireCurrentUser(request)
    const userId = parseId(segments[1], 'user ID')
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '100')
    const offset = Number(request.nextUrl.searchParams.get('offset') ?? '0')

    const rows = await queryRows<SubmissionRow[]>(
      `
        SELECT id, problem_id AS problemId, user_id AS userId, code, language, status, score, submitted_at AS submittedAt
        FROM submissions
        WHERE user_id = ?
        ORDER BY submitted_at DESC
        LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    )

    return json(await Promise.all(rows.map(hydrateSubmission)))
  }

  if (request.method === 'GET' && segments[0] === 'problem' && segments[1]) {
    await requireCurrentUser(request)
    const problemId = parseId(segments[1], 'problem ID')
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '100')
    const offset = Number(request.nextUrl.searchParams.get('offset') ?? '0')

    const rows = await queryRows<SubmissionRow[]>(
      `
        SELECT id, problem_id AS problemId, user_id AS userId, code, language, status, score, submitted_at AS submittedAt
        FROM submissions
        WHERE problem_id = ?
        ORDER BY submitted_at DESC
        LIMIT ? OFFSET ?
      `,
      [problemId, limit, offset]
    )

    return json(await Promise.all(rows.map(hydrateSubmission)))
  }

  if (request.method === 'GET' && segments.length === 1) {
    await requireCurrentUser(request)
    const submissionId = parseId(segments[0], 'submission ID')
    const rows = await queryRows<SubmissionRow[]>(
      `
        SELECT id, problem_id AS problemId, user_id AS userId, code, language, status, score, submitted_at AS submittedAt
        FROM submissions
        WHERE id = ?
      `,
      [submissionId]
    )

    const submission = rows[0]
    if (!submission) {
      throw new ApiError(404, 'not_found', 'Submission not found')
    }

    return json(await hydrateSubmission(submission))
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
