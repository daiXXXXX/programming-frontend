'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { CodeEditor } from '@/components/CodeEditor'
import {
  api,
  CreateProblemRequest,
  DifficultyLevel,
  ProblemStandardProgram,
  ProblemValidationResponse,
} from '@/lib/api'
import { useAuth } from '@/hooks'
import { useAppStore } from '@/store/appStore'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type StepKey = 'basic' | 'cases' | 'program'

type DraftExample = {
  id: string
  input: string
  output: string
  explanation: string
}

type DraftJudgeCase = {
  id: string
  input: string
  expectedOutput: string
  description: string
}

const STEP_ITEMS = [
  { key: 'basic', label: '第一步：题目描述' },
  { key: 'cases', label: '第二步：测试用例' },
  { key: 'program', label: '第三步：标准程序' },
] as const satisfies { key: StepKey; label: string }[]

const DEFAULT_TAG_OPTIONS = [
  '数组',
  '字符串',
  '哈希表',
  '双指针',
  '二分',
  '排序',
  '栈',
  '队列',
  '链表',
  '树',
  '二叉树',
  '图论',
  'DFS',
  'BFS',
  '动态规划',
  '贪心',
  '数学',
  '模拟',
]

const LANGUAGE_OPTIONS: { label: string; value: ProblemStandardProgram['language'] }[] = [
  { label: 'JavaScript', value: 'JavaScript' },
  { label: 'C', value: 'C' },
]

const DIFFICULTY_OPTIONS: { label: string; value: DifficultyLevel }[] = [
  { label: '简单', value: 'Easy' },
  { label: '中等', value: 'Medium' },
  { label: '困难', value: 'Hard' },
]

const BASIC_INFO_FIELD_NAMES: Array<keyof CreateProblemRequest> = [
  'title',
  'difficulty',
  'description',
  'inputFormat',
  'outputFormat',
  'constraints',
  'tags',
]

const createDraftId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createEmptyExample = (): DraftExample => ({
  id: createDraftId('example'),
  input: '',
  output: '',
  explanation: '',
})

const createEmptyJudgeCase = (): DraftJudgeCase => ({
  id: createDraftId('judge'),
  input: '',
  expectedOutput: '',
  description: '',
})

// parseBatchCaseFiles 解析成对的 .in/.out 文件，供样例和隐藏测试批量导入复用。
async function parseBatchCaseFiles(files: File[]) {
  const pairMap = new Map<string, { input?: File; output?: File }>()

  for (const file of files) {
    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.in') && !lowerName.endsWith('.out')) {
      throw new Error('批量上传仅支持 .in 和 .out 文件')
    }

    const baseName = file.name.replace(/\.(in|out)$/i, '')
    const currentPair = pairMap.get(baseName) ?? {}
    if (lowerName.endsWith('.in')) {
      currentPair.input = file
    } else {
      currentPair.output = file
    }
    pairMap.set(baseName, currentPair)
  }

  const incompletePairs = Array.from(pairMap.entries())
    .filter(([, pair]) => !pair.input || !pair.output)
    .map(([baseName]) => baseName)

  if (incompletePairs.length > 0) {
    throw new Error(`以下文件缺少配对的 .in 或 .out：${incompletePairs.join('、')}`)
  }

  const sortedPairs = Array.from(pairMap.entries()).sort(([left], [right]) =>
    left.localeCompare(right, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
  )

  return Promise.all(
    sortedPairs.map(async ([baseName, pair]) => ({
      baseName,
      input: await pair.input!.text(),
      output: await pair.output!.text(),
    }))
  )
}

// buildAllTestCases 将公开样例与隐藏测试合并成判题数据，确保录题后样例测试可直接复用。
function buildAllTestCases(examples: DraftExample[], judgeCases: DraftJudgeCase[]): CreateProblemRequest['testCases'] {
  const sampleCases = examples.map((example, index) => ({
    input: example.input,
    expectedOutput: example.output,
    description: example.explanation || `样例 ${index + 1}`,
    isSample: true,
  }))

  const hiddenCases = judgeCases.map((testCase, index) => ({
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    description: testCase.description || `测试用例 ${index + 1}`,
    isSample: false,
  }))

  return [...sampleCases, ...hiddenCases]
}

export default function CreateProblemPage() {
  const router = useRouter()
  const clearCache = useAppStore((state) => state.clearCache)
  const { user, initialized, isAuthenticated, hasPermission } = useAuth()
  const [form] = Form.useForm<CreateProblemRequest>()
  const [activeStep, setActiveStep] = useState<StepKey>('basic')
  const [examples, setExamples] = useState<DraftExample[]>([createEmptyExample()])
  const [judgeCases, setJudgeCases] = useState<DraftJudgeCase[]>([createEmptyJudgeCase()])
  const [standardLanguage, setStandardLanguage] = useState<ProblemStandardProgram['language']>('JavaScript')
  const [standardCode, setStandardCode] = useState('')
  const [validation, setValidation] = useState<ProblemValidationResponse | null>(null)
  const [validationSignature, setValidationSignature] = useState('')
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sampleUploadRef = useRef<HTMLInputElement | null>(null)
  const judgeUploadRef = useRef<HTMLInputElement | null>(null)

  const allTestCases = useMemo(() => buildAllTestCases(examples, judgeCases), [examples, judgeCases])
  const currentSignature = useMemo(
    () => JSON.stringify({ allTestCases, standardLanguage, standardCode }),
    [allTestCases, standardLanguage, standardCode]
  )
  const validationReady = validation?.ready && validationSignature === currentSignature

  const validateCaseCollections = useCallback(() => {
    if (examples.length === 0) {
      throw new Error('请至少提供一个公开样例')
    }
    if (judgeCases.length === 0) {
      throw new Error('请至少提供一个隐藏测试用例')
    }

    examples.forEach((example, index) => {
      if (!example.input.trim() || !example.output.trim()) {
        throw new Error(`样例 ${index + 1} 需要填写完整的输入与输出`)
      }
    })

    judgeCases.forEach((testCase, index) => {
      if (!testCase.input.trim() || !testCase.expectedOutput.trim()) {
        throw new Error(`测试用例 ${index + 1} 需要填写完整的输入与输出`)
      }
    })
  }, [examples, judgeCases])

  const buildPayload = useCallback(async (): Promise<CreateProblemRequest> => {
    // 多步骤表单在切换 Tab 后会卸载非当前步骤节点，因此这里先显式校验基础字段，
    // 再从表单仓库里读取全部已保存的值，避免提交时把第一步的数据丢掉。
    await form.validateFields(BASIC_INFO_FIELD_NAMES)
    validateCaseCollections()
    const values = form.getFieldsValue(true) as Partial<CreateProblemRequest>

    return {
      ...values,
      title: values.title || '',
      difficulty: values.difficulty || 'Medium',
      description: values.description || '',
      inputFormat: values.inputFormat || '',
      outputFormat: values.outputFormat || '',
      constraints: values.constraints || '',
      examples: examples.map((example) => ({
        input: example.input,
        output: example.output,
        explanation: example.explanation || undefined,
      })),
      testCases: buildAllTestCases(examples, judgeCases),
      tags: values.tags || [],
      standardProgram: {
        language: standardLanguage,
        code: standardCode,
      },
    }
  }, [examples, form, judgeCases, standardCode, standardLanguage, validateCaseCollections])

  // runDraftValidation 统一触发后端校验，确保“完成录题”前标准程序真实通过全部测试数据。
  const runDraftValidation = useCallback(async () => {
    if (!standardCode.trim()) {
      message.error('请先填写标准程序代码')
      setActiveStep('program')
      return null
    }

    try {
      const payload = await buildPayload()
      setValidating(true)
      const result = await api.validateProblemDraft({
        testCases: payload.testCases,
        standardProgram: payload.standardProgram!,
      })
      setValidation(result)
      setValidationSignature(JSON.stringify({
        allTestCases: payload.testCases,
        standardLanguage: payload.standardProgram!.language,
        standardCode: payload.standardProgram!.code,
      }))

      if (result.ready) {
        message.success('标准程序已通过当前全部测试用例')
      } else {
        message.warning('标准程序未通过全部测试用例，请先修正后再录题')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '标准程序校验失败'
      message.error(errorMessage)
      return null
    } finally {
      setValidating(false)
    }
  }, [buildPayload, standardCode])

  const handleBatchImport = useCallback(
    async (target: 'examples' | 'judgeCases', files: FileList | null) => {
      if (!files || files.length === 0) {
        return
      }

      try {
        const importedPairs = await parseBatchCaseFiles(Array.from(files))
        if (target === 'examples') {
          setExamples((previous) => [
            ...previous,
            ...importedPairs.map((pair) => ({
              id: createDraftId('example'),
              input: pair.input,
              output: pair.output,
              explanation: `批量导入：${pair.baseName}`,
            })),
          ])
        } else {
          setJudgeCases((previous) => [
            ...previous,
            ...importedPairs.map((pair) => ({
              id: createDraftId('judge'),
              input: pair.input,
              expectedOutput: pair.output,
              description: `批量导入：${pair.baseName}`,
            })),
          ])
        }
        message.success(`已成功导入 ${importedPairs.length} 组文件`)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '批量导入失败')
      }
    },
    []
  )

  const handleNext = useCallback(async () => {
    try {
      if (activeStep === 'basic') {
        await form.validateFields()
        setActiveStep('cases')
        return
      }

      if (activeStep === 'cases') {
        validateCaseCollections()
        setActiveStep('program')
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    }
  }, [activeStep, form, validateCaseCollections])

  const handleSubmit = useCallback(async () => {
    try {
      const payload = await buildPayload()
      setSubmitting(true)

      let latestValidation = validation
      if (!validationReady) {
        latestValidation = await runDraftValidation()
      }

      if (!latestValidation?.ready) {
        return
      }

      await api.createProblem(payload)
      clearCache()
      message.success('题目录入成功')
      router.push('/workspace')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '题目录入失败')
    } finally {
      setSubmitting(false)
    }
  }, [buildPayload, clearCache, router, runDraftValidation, validation, validationReady])

  // 只允许管理员和教师进入录题页，避免学生直接访问录题流程。
  useEffect(() => {
    if (!initialized) {
      return
    }
    if (!isAuthenticated || !user || !hasPermission('instructor')) {
      router.replace('/workspace')
    }
  }, [hasPermission, initialized, isAuthenticated, router, user])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated || !user || !hasPermission('instructor')) {
    return null
  }

  const renderExampleEditor = (example: DraftExample, index: number) => (
    <Card
      key={example.id}
      size="small"
      title={`样例 ${index + 1}`}
      extra={
        examples.length > 1 ? (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setExamples((previous) => previous.filter((item) => item.id !== example.id))}
          >
            删除
          </Button>
        ) : null
      }
      className="shadow-sm"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text strong>输入</Text>
          <TextArea
            value={example.input}
            onChange={(event) =>
              setExamples((previous) =>
                previous.map((item) => (item.id === example.id ? { ...item, input: event.target.value } : item))
              )
            }
            rows={4}
            placeholder="请输入样例输入"
          />
        </div>
        <div>
          <Text strong>输出</Text>
          <TextArea
            value={example.output}
            onChange={(event) =>
              setExamples((previous) =>
                previous.map((item) => (item.id === example.id ? { ...item, output: event.target.value } : item))
              )
            }
            rows={4}
            placeholder="请输入样例输出"
          />
        </div>
        <div>
          <Text strong>说明</Text>
          <TextArea
            value={example.explanation}
            onChange={(event) =>
              setExamples((previous) =>
                previous.map((item) => (item.id === example.id ? { ...item, explanation: event.target.value } : item))
              )
            }
            rows={3}
            placeholder="可选：补充样例解释"
          />
        </div>
      </Space>
    </Card>
  )

  const renderJudgeCaseEditor = (testCase: DraftJudgeCase, index: number) => (
    <Card
      key={testCase.id}
      size="small"
      title={`测试用例 ${index + 1}`}
      extra={
        judgeCases.length > 1 ? (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setJudgeCases((previous) => previous.filter((item) => item.id !== testCase.id))}
          >
            删除
          </Button>
        ) : null
      }
      className="shadow-sm"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text strong>输入</Text>
          <TextArea
            value={testCase.input}
            onChange={(event) =>
              setJudgeCases((previous) =>
                previous.map((item) => (item.id === testCase.id ? { ...item, input: event.target.value } : item))
              )
            }
            rows={4}
            placeholder="请输入测试输入"
          />
        </div>
        <div>
          <Text strong>输出</Text>
          <TextArea
            value={testCase.expectedOutput}
            onChange={(event) =>
              setJudgeCases((previous) =>
                previous.map((item) =>
                  item.id === testCase.id ? { ...item, expectedOutput: event.target.value } : item
                )
              )
            }
            rows={4}
            placeholder="请输入预期输出"
          />
        </div>
        <div>
          <Text strong>备注</Text>
          <TextArea
            value={testCase.description}
            onChange={(event) =>
              setJudgeCases((previous) =>
                previous.map((item) => (item.id === testCase.id ? { ...item, description: event.target.value } : item))
              )
            }
            rows={3}
            placeholder="可选：记录该测试点覆盖的边界场景"
          />
        </div>
      </Space>
    </Card>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card className="shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Space align="center" size={12}>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/workspace')}>
                    返回题目列表
                  </Button>
                  <Tag color="purple" icon={<EditOutlined />}>
                    管理员 / 教师可用
                  </Tag>
                </Space>
                <Title level={2} style={{ marginTop: 16, marginBottom: 8 }}>
                  我要出题
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  录题流程分为题目描述、测试用例和标准程序三步。系统会在最终提交前强制校验标准程序是否通过全部测试数据。
                </Paragraph>
              </div>
              <Result
                status="info"
                icon={<RocketOutlined />}
                title="录题提示"
                subTitle="样例会自动同步为公开测试点，隐藏测试仅用于正式评测。"
              />
            </div>
          </Card>

          <Card className="shadow-sm">
            <Tabs
              activeKey={activeStep}
              items={STEP_ITEMS.map((item) => ({ key: item.key, label: item.label }))}
              onChange={(key) => setActiveStep(key as StepKey)}
            />

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                difficulty: 'Medium',
                tags: ['数组'],
              }}
            >
              {activeStep === 'basic' ? (
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Form.Item label="题目标题" name="title" rules={[{ required: true, message: '请输入题目标题' }]}>
                      <Input placeholder="例如：两数之和" maxLength={120} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="题目描述"
                      name="description"
                      rules={[{ required: true, message: '请输入题目描述' }]}
                    >
                      <TextArea rows={8} placeholder="请描述题目背景、任务目标和返回结果要求" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="输入格式"
                      name="inputFormat"
                      rules={[{ required: true, message: '请输入输入格式' }]}
                    >
                      <TextArea rows={6} placeholder="请描述输入参数结构、取值含义等内容" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="输出格式"
                      name="outputFormat"
                      rules={[{ required: true, message: '请输入输出格式' }]}
                    >
                      <TextArea rows={6} placeholder="请描述输出形式、精度、顺序等要求" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="约束条件"
                      name="constraints"
                      rules={[{ required: true, message: '请输入约束条件' }]}
                    >
                      <TextArea rows={5} placeholder="请填写数据范围、时间复杂度提示、边界条件等信息" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="题目标签" name="tags">
                      <Select
                        mode="tags"
                        placeholder="请选择或自定义题目标签"
                        options={DEFAULT_TAG_OPTIONS.map((tag) => ({ label: tag, value: tag }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="题目难度"
                      name="difficulty"
                      rules={[{ required: true, message: '请选择题目难度' }]}
                    >
                      <Select options={DIFFICULTY_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null}

              {activeStep === 'cases' ? (
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message="样例说明"
                    description="这里填写的样例会直接展示在题目详情页，同时也会自动作为公开测试点参与“运行样例测试”。"
                  />
                  <div>
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Title level={4} style={{ marginBottom: 4 }}>公开样例</Title>
                        <Text type="secondary">支持手动新增，也支持批量导入成对的 .in / .out 文件。</Text>
                      </div>
                      <Space wrap>
                        <input
                          ref={sampleUploadRef}
                          type="file"
                          multiple
                          accept=".in,.out"
                          className="hidden"
                          onChange={(event) => {
                            handleBatchImport('examples', event.target.files)
                            event.target.value = ''
                          }}
                        />
                        <Button icon={<CloudUploadOutlined />} onClick={() => sampleUploadRef.current?.click()}>
                          批量导入 .in/.out
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setExamples((previous) => [...previous, createEmptyExample()])}>
                          新增样例
                        </Button>
                      </Space>
                    </div>
                    <div className="grid gap-4">{examples.map(renderExampleEditor)}</div>
                  </div>

                  <Divider />

                  <div>
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <Title level={4} style={{ marginBottom: 4 }}>隐藏测试用例</Title>
                        <Text type="secondary">这些用例不会展示给学生，仅用于正式评测与标准程序校验。</Text>
                      </div>
                      <Space wrap>
                        <input
                          ref={judgeUploadRef}
                          type="file"
                          multiple
                          accept=".in,.out"
                          className="hidden"
                          onChange={(event) => {
                            handleBatchImport('judgeCases', event.target.files)
                            event.target.value = ''
                          }}
                        />
                        <Button icon={<CloudUploadOutlined />} onClick={() => judgeUploadRef.current?.click()}>
                          批量导入 .in/.out
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setJudgeCases((previous) => [...previous, createEmptyJudgeCase()])}>
                          新增测试点
                        </Button>
                      </Space>
                    </div>
                    <div className="grid gap-4">{judgeCases.map(renderJudgeCaseEditor)}</div>
                  </div>
                </Space>
              ) : null}

              {activeStep === 'program' ? (
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Alert
                    type="warning"
                    showIcon
                    message="完成录题前必须通过校验"
                    description="只有当标准程序通过全部测试用例后，系统才允许最终录题。若你修改了样例、隐藏测试或标准程序，需重新校验。"
                  />
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Text strong>标准程序语言</Text>
                      <Select
                        className="mt-2 w-full"
                        value={standardLanguage}
                        options={LANGUAGE_OPTIONS}
                        onChange={(value) => setStandardLanguage(value)}
                      />
                    </Col>
                    <Col xs={24} md={16}>
                      <Text strong>当前测试数据统计</Text>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Tag color="blue">公开样例 {examples.length}</Tag>
                        <Tag color="purple">隐藏测试 {judgeCases.length}</Tag>
                        <Tag color="gold">总测试点 {allTestCases.length}</Tag>
                      </div>
                    </Col>
                  </Row>

                  <div>
                    <Text strong>标准程序代码</Text>
                    <div className="mt-2">
                      <CodeEditor
                        value={standardCode}
                        onChange={setStandardCode}
                        language={standardLanguage}
                        height="420px"
                        placeholder="请输入标准程序代码"
                      />
                    </div>
                  </div>

                  {validation && !validationReady ? (
                    <Alert
                      type="info"
                      showIcon
                      message="检测到录题内容已变更"
                      description="你在上次校验后修改了测试数据或标准程序，请重新点击“校验标准程序”。"
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button type="primary" loading={validating} onClick={runDraftValidation}>
                      校验标准程序
                    </Button>
                    <Button loading={submitting} onClick={handleSubmit} icon={<CheckCircleFilled />}>
                      完成录题
                    </Button>
                  </div>

                  {validation ? (
                    <Card title="标准程序校验结果" className="shadow-sm">
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <div className="flex flex-wrap gap-3">
                          <Tag color={validation.result.status === 'Accepted' ? 'success' : 'error'}>
                            状态：{validation.result.status}
                          </Tag>
                          <Tag color="processing">得分：{validation.result.score}%</Tag>
                          <Tag>语言：{validation.result.language}</Tag>
                        </div>
                        {validation.result.testResults?.length ? (
                          <div className="grid gap-4">
                            {validation.result.testResults.map((item, index) => (
                              <Card key={`${item.testCaseId}-${index}`} size="small" style={{ background: '#fafafa' }}>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                  <Space wrap>
                                    <Tag color={item.passed ? 'success' : 'error'}>
                                      测试点 {index + 1} {item.passed ? '通过' : '失败'}
                                    </Tag>
                                    {item.executionTime !== undefined ? <Tag>{item.executionTime}ms</Tag> : null}
                                  </Space>
                                  <div>
                                    <Text strong>输入</Text>
                                    <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-sm">{item.input || '-'}</pre>
                                  </div>
                                  <div>
                                    <Text strong>期望输出</Text>
                                    <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-sm">{item.expectedOutput || '-'}</pre>
                                  </div>
                                  <div>
                                    <Text strong>{item.error ? '错误信息' : '实际输出'}</Text>
                                    <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-sm">
                                      {item.error || item.actualOutput || '-'}
                                    </pre>
                                  </div>
                                </Space>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Empty description="暂无校验结果" />
                        )}
                      </Space>
                    </Card>
                  ) : null}
                </Space>
              ) : null}
            </Form>

            <Divider />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Text type="secondary">创建人：{user.username}</Text>
              <Space wrap>
                <Button onClick={() => setActiveStep(STEP_ITEMS[Math.max(0, STEP_ITEMS.findIndex((item) => item.key === activeStep) - 1)].key)} disabled={activeStep === 'basic'}>
                  上一步
                </Button>
                {activeStep !== 'program' ? (
                  <Button type="primary" onClick={handleNext}>
                    下一步
                  </Button>
                ) : (
                  <Button type="primary" loading={submitting} onClick={handleSubmit} icon={<CheckCircleFilled />}>
                    完成录题
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Space>
      </div>
    </div>
  )
}
