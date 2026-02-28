import { TestCase, TestResult, SubmissionStatus } from './types'

export function evaluateCode(code: string, testCases: TestCase[]): TestResult[] {
  const results: TestResult[] = []

  for (const testCase of testCases) {
    const startTime = Date.now()
    try {
      const func = new Function('input', `
        ${code}
        return typeof processInput === 'function' ? processInput(input) : null;
      `)
      
      const actualOutput = String(func(testCase.input)).trim()
      const expectedOutput = testCase.expectedOutput.trim()
      const executionTime = Date.now() - startTime
      
      results.push({
        testCaseId: testCase.id,
        passed: actualOutput === expectedOutput,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        executionTime
      })
    } catch (error) {
      const executionTime = Date.now() - startTime
      results.push({
        testCaseId: testCase.id,
        passed: false,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      })
    }
  }

  return results
}

export function calculateScore(testResults: TestResult[]): number {
  const passedCount = testResults.filter(r => r.passed).length
  return Math.round((passedCount / testResults.length) * 100)
}

export function getSubmissionStatus(testResults: TestResult[]): SubmissionStatus {
  const hasError = testResults.some(r => r.error)
  if (hasError) return 'Runtime Error'
  
  const allPassed = testResults.every(r => r.passed)
  return allPassed ? 'Accepted' : 'Wrong Answer'
}
