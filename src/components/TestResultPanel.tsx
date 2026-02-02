import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, CaretDown, CaretUp } from '@phosphor-icons/react'
import { TestResult, TestCase } from '@/lib/types'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface TestResultPanelProps {
  testResults: TestResult[]
  testCases: TestCase[]
}

export function TestResultPanel({ testResults, testCases }: TestResultPanelProps) {
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())
  
  const toggleTest = (id: string) => {
    const newExpanded = new Set(expandedTests)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedTests(newExpanded)
  }
  
  const passedCount = testResults.filter(r => r.passed).length
  const totalCount = testResults.length
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Test Results</h3>
        <Badge 
          variant={passedCount === totalCount ? 'default' : 'secondary'}
          className={passedCount === totalCount ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}
        >
          {passedCount}/{totalCount} Passed
        </Badge>
      </div>
      
      <div className="space-y-2">
        {testResults.map((result, index) => {
          const testCase = testCases.find(tc => tc.id === result.testCaseId)
          const isExpanded = expandedTests.has(result.testCaseId)
          
          return (
            <motion.div
              key={result.testCaseId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-4 border-l-4 ${result.passed ? 'border-l-success' : 'border-l-destructive'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {result.passed ? (
                      <CheckCircle className="text-success mt-0.5" size={20} weight="fill" />
                    ) : (
                      <XCircle className="text-destructive mt-0.5" size={20} weight="fill" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        Test Case {index + 1}
                        {testCase?.description && `: ${testCase.description}`}
                      </div>
                      {result.error && (
                        <div className="text-xs text-destructive mt-2 font-mono bg-destructive/10 p-2 rounded">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTest(result.testCaseId)}
                    className="ml-2"
                  >
                    {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                  </Button>
                </div>
                
                {isExpanded && testCase && (
                  <div className="mt-4 space-y-3 pt-3 border-t border-border">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
                      <div className="text-xs font-mono bg-muted p-2 rounded">{testCase.input}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Expected Output:</div>
                      <div className="text-xs font-mono bg-muted p-2 rounded">{testCase.expectedOutput}</div>
                    </div>
                    {result.actualOutput && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Actual Output:</div>
                        <div className="text-xs font-mono bg-muted p-2 rounded">{result.actualOutput}</div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
