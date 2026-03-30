import 'server-only'

import vm from 'node:vm'
import ts from 'typescript'

interface JudgeTestCase {
  id: number
  input: string
  expectedOutput: string
}

export interface JudgeResult {
  testCaseId: number
  passed: boolean
  input: string
  expectedOutput: string
  actualOutput?: string
  error?: string
  executionTime?: number
}

export type JudgeStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Pending'

const SUPPORTED_LANGUAGES = new Set(['javascript', 'js', 'typescript', 'ts'])
const EXECUTION_TIMEOUT_MS = Number(process.env.CODE_EXECUTION_TIMEOUT ?? '5000')

function normalizeLanguage(language?: string) {
  return String(language || 'JavaScript').trim().toLowerCase()
}

function buildRunnableCode(code: string, language?: string) {
  const normalized = normalizeLanguage(language)
  if (!SUPPORTED_LANGUAGES.has(normalized)) {
    throw new Error('当前 Next.js 版本仅支持 JavaScript / TypeScript 提交')
  }

  if (normalized === 'typescript' || normalized === 'ts') {
    return ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText
  }

  return code
}

// 这里保留最简单的服务端评测能力：执行 `processInput(input)` 并对比标准输出。
export function evaluateCode(code: string, language: string | undefined, testCases: JudgeTestCase[]): JudgeResult[] {
  const runnableCode = buildRunnableCode(code, language)

  return testCases.map((testCase) => {
    const startTime = Date.now()
    const result: JudgeResult = {
      testCaseId: testCase.id,
      passed: false,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
    }

    try {
      const sandbox = { input: testCase.input, result: null as unknown }
      const script = new vm.Script(`
        'use strict';
        ${runnableCode}
        result = typeof processInput === 'function' ? processInput(input) : null;
      `)

      script.runInNewContext(sandbox, { timeout: EXECUTION_TIMEOUT_MS })
      const value = sandbox.result

      result.actualOutput = String(value ?? '').trim()
      result.passed = result.actualOutput === String(testCase.expectedOutput).trim()
      result.executionTime = Date.now() - startTime
      return result
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.executionTime = Date.now() - startTime
      return result
    }
  })
}

// 按旧后端规则统计通过率，方便前端继续复用原有展示逻辑。
export function calculateScore(results: JudgeResult[]) {
  if (!results.length) {
    return 0
  }

  const passedCount = results.filter((item) => item.passed).length
  return Math.round((passedCount / results.length) * 100)
}

// 返回提交状态，保持与原系统中的状态文案一致。
export function getSubmissionStatus(results: JudgeResult[]): JudgeStatus {
  if (results.some((item) => item.error === 'Time Limit Exceeded')) {
    return 'Time Limit Exceeded'
  }

  if (results.some((item) => item.error)) {
    return 'Runtime Error'
  }

  if (results.every((item) => item.passed)) {
    return 'Accepted'
  }

  return 'Wrong Answer'
}
