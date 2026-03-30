import 'server-only'

import type { RowDataPacket } from 'mysql2/promise'
import type { NextRequest } from 'next/server'

import { execute, pool, queryRows, withTransaction } from '@/server/oj/db'
import { executeWith, ApiError, json, parseId, readJsonBody, type Queryable, queryWith } from '@/server/oj/services/core'
import { requireCurrentUser, requireInstructor } from '@/server/oj/services/user-service'

// 题目基础结构集中在该服务文件，便于题目与提交服务共享。
export interface ProblemRow extends RowDataPacket {
  id: number
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  createdAt: Date
  updatedAt: Date
}

interface ExampleRow extends RowDataPacket {
  id: number
  input: string
  output: string
  explanation: string | null
}

interface TestCaseRow extends RowDataPacket {
  id: number
  input: string
  expectedOutput: string
  description: string | null
  isSample?: number | boolean
}

// 题目示例的加载逻辑单独封装，便于列表和详情复用。
async function getProblemExamples(problemId: number, executor: Queryable) {
  const rows = await queryWith<ExampleRow[]>(
    executor,
    `
      SELECT id, input, output, explanation
      FROM problem_examples
      WHERE problem_id = ?
      ORDER BY display_order, id
    `,
    [problemId]
  )

  return rows.map((row) => ({
    id: Number(row.id),
    input: row.input,
    output: row.output,
    ...(row.explanation ? { explanation: row.explanation } : {}),
  }))
}

// 题目标签的查询逻辑集中管理，避免列表和详情各写一份 SQL。
async function getProblemTags(problemId: number, executor: Queryable) {
  const rows = await queryWith<RowDataPacket[]>(executor, `SELECT tag FROM problem_tags WHERE problem_id = ? ORDER BY id`, [problemId])
  return rows.map((row) => String(row.tag))
}

// 根据场景决定是否加载全部测试用例，列表页默认仅拿示例数据。
async function getProblemTestCases(problemId: number, includeAll: boolean, executor: Queryable) {
  const sql = includeAll
    ? `
        SELECT id, input, expected_output AS expectedOutput, description, is_sample AS isSample
        FROM test_cases
        WHERE problem_id = ?
        ORDER BY display_order, id
      `
    : `
        SELECT id, input, expected_output AS expectedOutput, description, is_sample AS isSample
        FROM test_cases
        WHERE problem_id = ? AND is_sample = 1
        ORDER BY display_order, id
        LIMIT 3
      `

  const rows = await queryWith<TestCaseRow[]>(executor, sql, [problemId])
  return rows.map((row) => ({
    id: Number(row.id),
    input: row.input,
    expectedOutput: row.expectedOutput,
    ...(row.description ? { description: row.description } : {}),
    ...(includeAll ? { isSample: Boolean(row.isSample) } : {}),
  }))
}

// 统一题目数据组装逻辑，保证列表和详情的数据结构完全一致。
export async function hydrateProblem(problem: ProblemRow, includeAllTestCases: boolean, executor: Queryable) {
  const [examples, tags, testCases] = await Promise.all([
    getProblemExamples(Number(problem.id), executor),
    getProblemTags(Number(problem.id), executor),
    getProblemTestCases(Number(problem.id), includeAllTestCases, executor),
  ])

  return {
    id: Number(problem.id),
    title: problem.title,
    difficulty: problem.difficulty,
    description: problem.description,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    examples,
    testCases,
    tags,
    createdAt: new Date(problem.createdAt).toISOString(),
    updatedAt: new Date(problem.updatedAt).toISOString(),
  }
}

// 题目详情查询会被题目服务和提交服务共同使用。
export async function getProblemById(problemId: number, includeAllTestCases = true, executor: Queryable = pool) {
  const rows = await queryWith<ProblemRow[]>(
    executor,
    `
      SELECT
        id,
        title,
        difficulty,
        description,
        input_format AS inputFormat,
        output_format AS outputFormat,
        constraints_text AS constraints,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM problems
      WHERE id = ?
      LIMIT 1
    `,
    [problemId]
  )

  const problem = rows[0]
  if (!problem) {
    return null
  }

  return hydrateProblem(problem, includeAllTestCases, executor)
}

// 题目服务负责题目查询与基础管理相关接口。
export async function handleProblemRoutes(request: NextRequest, segments: string[]) {
  if (request.method === 'GET' && segments.length === 0) {
    const name = request.nextUrl.searchParams.get('name')?.trim() ?? ''
    const rows = await queryRows<ProblemRow[]>(
      name
        ? `
            SELECT
              id,
              title,
              difficulty,
              description,
              input_format AS inputFormat,
              output_format AS outputFormat,
              constraints_text AS constraints,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM problems
            WHERE title LIKE ?
            ORDER BY id ASC
          `
        : `
            SELECT
              id,
              title,
              difficulty,
              description,
              input_format AS inputFormat,
              output_format AS outputFormat,
              constraints_text AS constraints,
              created_at AS createdAt,
              updated_at AS updatedAt
            FROM problems
            ORDER BY id ASC
          `,
      name ? [`%${name}%`] : []
    )

    const problems = await Promise.all(rows.map((row) => hydrateProblem(row, false, pool)))
    return json(problems)
  }

  if (request.method === 'GET' && segments.length === 1) {
    const problemId = parseId(segments[0], 'problem ID')
    const problem = await getProblemById(problemId, true)
    if (!problem) {
      throw new ApiError(404, 'not_found', 'Problem not found')
    }

    return json(problem)
  }

  if (request.method === 'POST' && segments.length === 0) {
    const currentUser = await requireCurrentUser(request)
    requireInstructor(currentUser)
    const body = await readJsonBody<any>(request)

    const problemId = await withTransaction(async (connection) => {
      const result = await executeWith(
        connection,
        `
          INSERT INTO problems (title, difficulty, description, input_format, output_format, constraints_text, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [body.title, body.difficulty, body.description, body.inputFormat, body.outputFormat, body.constraints, currentUser.id]
      )

      const createdId = Number(result.insertId)
      for (const tag of body.tags ?? []) {
        await executeWith(connection, `INSERT INTO problem_tags (problem_id, tag) VALUES (?, ?)`, [createdId, String(tag)])
      }
      for (const [index, example] of (body.examples ?? []).entries()) {
        await executeWith(
          connection,
          `INSERT INTO problem_examples (problem_id, input, output, explanation, display_order) VALUES (?, ?, ?, ?, ?)`,
          [createdId, example.input, example.output, example.explanation ?? null, index]
        )
      }
      for (const [index, testCase] of (body.testCases ?? []).entries()) {
        await executeWith(
          connection,
          `INSERT INTO test_cases (problem_id, input, expected_output, description, is_sample, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [createdId, testCase.input, testCase.expectedOutput, testCase.description ?? null, testCase.isSample ? 1 : 0, index]
        )
      }

      return createdId
    })

    const problem = await getProblemById(problemId, true)
    return json(problem, 201)
  }

  if (request.method === 'PUT' && segments.length === 1) {
    const currentUser = await requireCurrentUser(request)
    requireInstructor(currentUser)
    const problemId = parseId(segments[0], 'problem ID')
    const body = await readJsonBody<any>(request)

    await withTransaction(async (connection) => {
      const updated = await executeWith(
        connection,
        `
          UPDATE problems
          SET title = ?, difficulty = ?, description = ?, input_format = ?, output_format = ?, constraints_text = ?, updated_at = NOW()
          WHERE id = ?
        `,
        [body.title, body.difficulty, body.description, body.inputFormat, body.outputFormat, body.constraints, problemId]
      )

      if (updated.affectedRows === 0) {
        throw new ApiError(404, 'not_found', 'Problem not found')
      }

      await executeWith(connection, `DELETE FROM problem_tags WHERE problem_id = ?`, [problemId])
      await executeWith(connection, `DELETE FROM problem_examples WHERE problem_id = ?`, [problemId])
      await executeWith(connection, `DELETE FROM test_cases WHERE problem_id = ?`, [problemId])

      for (const tag of body.tags ?? []) {
        await executeWith(connection, `INSERT INTO problem_tags (problem_id, tag) VALUES (?, ?)`, [problemId, String(tag)])
      }
      for (const [index, example] of (body.examples ?? []).entries()) {
        await executeWith(
          connection,
          `INSERT INTO problem_examples (problem_id, input, output, explanation, display_order) VALUES (?, ?, ?, ?, ?)`,
          [problemId, example.input, example.output, example.explanation ?? null, index]
        )
      }
      for (const [index, testCase] of (body.testCases ?? []).entries()) {
        await executeWith(
          connection,
          `INSERT INTO test_cases (problem_id, input, expected_output, description, is_sample, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
          [problemId, testCase.input, testCase.expectedOutput, testCase.description ?? null, testCase.isSample ? 1 : 0, index]
        )
      }
    })

    const problem = await getProblemById(problemId, true)
    return json(problem)
  }

  if (request.method === 'DELETE' && segments.length === 1) {
    const currentUser = await requireCurrentUser(request)
    requireInstructor(currentUser)
    const problemId = parseId(segments[0], 'problem ID')
    const result = await execute(`DELETE FROM problems WHERE id = ?`, [problemId])
    if (result.affectedRows === 0) {
      throw new ApiError(404, 'not_found', 'Problem not found')
    }

    return json({ message: 'Problem deleted successfully' })
  }

  throw new ApiError(404, 'not_found', 'Route not found')
}
