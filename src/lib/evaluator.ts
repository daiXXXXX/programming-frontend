import { TestCase, TestResult } from './types'

export function evaluateCode(code: string, testCases: TestCase[]): TestResult[] {
  const results: TestResult[] = []

  for (const testCase of testCases) {
    try {
      const func = new Function('input', `
        ${code}
        return typeof processInput === 'function' ? processInput(input) : null;
      `)
      
      const actualOutput = String(func(testCase.input)).trim()
      const expectedOutput = testCase.expectedOutput.trim()
      
      results.push({
        testCaseId: testCase.id,
        passed: actualOutput === expectedOutput,
        actualOutput
      })
    } catch (error) {
      results.push({
        testCaseId: testCase.id,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

export function calculateScore(testResults: TestResult[]): number {
  const passedCount = testResults.filter(r => r.passed).length
  return Math.round((passedCount / testResults.length) * 100)
}

export function getSubmissionStatus(testResults: TestResult[]): 'passed' | 'failed' | 'error' {
  const hasError = testResults.some(r => r.error)
  if (hasError) return 'error'
  
  const allPassed = testResults.every(r => r.passed)
  return allPassed ? 'passed' : 'failed'
}
