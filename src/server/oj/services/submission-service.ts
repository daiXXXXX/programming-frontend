import 'server-only'

import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { queryRows, withTransaction } from '@/server/oj/db'
import { calculateScore, evaluateCode, getSubmissionStatus } from '@/server/oj/evaluator'
import { deleteCachedKeysByPattern, enqueueJsonTask, getRedisClient } from '@/server/oj/redis'
import { ApiError, executeWith, json, parseId, readJsonBody } from '@/server/oj/services/core'
import { getProblemById } from '@/server/oj/services/problem-service'
import { requireCurrentUser } from '@/server/oj/services/user-service'
import { ensureJudgeWorkerStarted, JUDGE_QUEUE_NAME, registerJudgeTaskProcessor, type JudgeQueueTask } from '@/server/oj/submission-queue'

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

// 统一读取提交主表记录，避免同步评测、异步评测和详情接口分别维护查询 SQL。
async function getSubmissionRowById(submissionId: number) {
  const rows = await queryRows<SubmissionRow[]>(
    `
      SELECT id, problem_id AS problemId, user_id AS userId, code, language, status, score, submitted_at AS submittedAt
      FROM submissions
      WHERE id = ?
    `,
    [submissionId]
  )

  return rows[0] ?? null
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

// 排行榜依赖用户统计表，提交结果落库后需要清理所有榜单缓存。
async function invalidateRankingCache() {
  await deleteCachedKeysByPattern('ranking', '*')
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

// Pending 提交先写入主表，后续再由队列消费者补写测试结果与最终状态。
async function createPendingSubmission(problemId: number, userId: number, code: string, language: string) {
  return withTransaction(async (connection) => {
    const created = await executeWith(
      connection,
      `INSERT INTO submissions (problem_id, user_id, code, language, status, score) VALUES (?, ?, ?, ?, ?, ?)` ,
      [problemId, userId, code, language, 'Pending', 0]
    )

    return Number(created.insertId)
  })
}

// 统一保存评测结果，保证同步与异步两条路径最终写库逻辑完全一致。
async function saveSubmissionResult(submissionId: number, userId: number, status: SubmissionRow['status'], score: number, results: Array<{
  testCaseId: number
  passed: boolean
  actualOutput?: string
  error?: string
  executionTime?: number
}>) {
  await withTransaction(async (connection) => {
    await executeWith(connection, `UPDATE submissions SET status = ?, score = ? WHERE id = ?`, [status, score, submissionId])
    await executeWith(connection, `DELETE FROM test_results WHERE submission_id = ?`, [submissionId])

    for (const result of results) {
      await executeWith(
        connection,
        `
          INSERT INTO test_results (submission_id, test_case_id, passed, actual_output, error_message, execution_time)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [submissionId, result.testCaseId, result.passed ? 1 : 0, result.actualOutput ?? null, result.error ?? null, result.executionTime ?? null]
      )
    }

    await updateUserStats(connection, userId)
    await updateDailyActivity(connection, userId)
  })

  if (status === 'Accepted') {
    await invalidateRankingCache()
  }
}

// 发生评测异常时回写失败状态，避免队列任务异常后提交长期停留在 Pending。
async function markSubmissionAsRuntimeError(submissionId: number, userId: number) {
  await saveSubmissionResult(submissionId, userId, 'Runtime Error', 0, [])
}

// 将同步评测逻辑提炼成可复用函数，队列降级时可直接复用，不重复拼装 SQL。
async function createEvaluatedSubmission(problemId: number, userId: number, code: string, language: string, results: ReturnType<typeof evaluateCode>) {
  const score = calculateScore(results)
  const status = getSubmissionStatus(results)

  const submissionId = await withTransaction(async (connection) => {
    const created = await executeWith(
      connection,
      `INSERT INTO submissions (problem_id, user_id, code, language, status, score) VALUES (?, ?, ?, ?, ?, ?)` ,
      [problemId, userId, code, language, status, score]
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

    await updateUserStats(connection, userId)
    await updateDailyActivity(connection, userId)
    return createdId
  })

  if (status === 'Accepted') {
    await invalidateRankingCache()
  }

  return submissionId
}

// 队列消费者真正执行评测，并在异常时兜底回写 Runtime Error。
async function processJudgeTask(task: JudgeQueueTask) {
  try {
    const problem = await getProblemById(task.problemId, true)
    if (!problem) {
      await markSubmissionAsRuntimeError(task.submissionId, task.userId)
      return
    }

    const results = evaluateCode(
      task.code,
      task.language,
      problem.testCases.map((item) => ({
        id: Number(item.id),
        input: item.input,
        expectedOutput: item.expectedOutput,
      }))
    )

    await saveSubmissionResult(task.submissionId, task.userId, getSubmissionStatus(results), calculateScore(results), results)
  } catch (error) {
    console.error('[submission-queue] judge task failed:', error)
    await markSubmissionAsRuntimeError(task.submissionId, task.userId)
  }
}

registerJudgeTaskProcessor(processJudgeTask)

// 提交服务负责代码提交、提交详情和提交历史查询等接口。
export async function handleSubmissionRoutes(request: NextRequest, segments: string[]) {
  // 每次访问提交服务都尝试确保队列消费者已启动，支持服务重启后的自动恢复。
  await ensureJudgeWorkerStarted()

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

    const language = body.language || 'JavaScript'
    const redisClient = await getRedisClient()
    if (redisClient) {
      const submissionId = await createPendingSubmission(problemId, Number(currentUser.id), body.code, language)

      const task: JudgeQueueTask = {
        submissionId,
        problemId,
        userId: Number(currentUser.id),
        code: body.code,
        language,
      }

      try {
        await enqueueJsonTask(JUDGE_QUEUE_NAME, task)
        const pendingSubmission = await getSubmissionRowById(submissionId)
        if (!pendingSubmission) {
          throw new ApiError(500, 'server_error', 'Submission created but could not be loaded')
        }

        return json(await hydrateSubmission(pendingSubmission), 202)
      } catch (error) {
        console.warn('[submission-queue] queue push failed, fallback to inline judge:', error)
        await processJudgeTask(task)

        const fallbackSubmission = await getSubmissionRowById(submissionId)
        if (!fallbackSubmission) {
          throw new ApiError(500, 'server_error', 'Submission created but could not be loaded')
        }

        return json(await hydrateSubmission(fallbackSubmission), 201)
      }
    }

    const results = evaluateCode(
      body.code,
      language,
      problem.testCases.map((item) => ({
        id: Number(item.id),
        input: item.input,
        expectedOutput: item.expectedOutput,
      }))
    )

    const submissionId = await createEvaluatedSubmission(problemId, Number(currentUser.id), body.code, language, results)
    const submission = await getSubmissionRowById(submissionId)
    if (!submission) {
      throw new ApiError(500, 'server_error', 'Submission created but could not be loaded')
    }

    return json(await hydrateSubmission(submission), 201)
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
    const submission = await getSubmissionRowById(submissionId)
    if (!submission) {
      throw new ApiError(404, 'not_found', 'Submission not found')
    }

    return json(await hydrateSubmission(submission))
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
