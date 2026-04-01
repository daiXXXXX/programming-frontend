import 'server-only'

import { createRedisWorkerClient, dequeueJsonTask } from '@/server/oj/redis'

export const JUDGE_QUEUE_NAME = 'queue:judge'

export interface JudgeQueueTask {
  submissionId: number
  problemId: number
  userId: number
  code: string
  language: string
}

type JudgeTaskProcessor = (task: JudgeQueueTask) => Promise<void>

// 通过全局标记确保每个 Node 进程只启动一组评测消费者。
declare global {
  var __ojJudgeWorkerStarted: boolean | undefined
  var __ojJudgeWorkerBootPromise: Promise<void> | undefined
}

let judgeTaskProcessor: JudgeTaskProcessor | null = null

// 提交服务在模块加载时注册真正的评测处理逻辑，避免队列模块与业务层循环依赖。
export function registerJudgeTaskProcessor(processor: JudgeTaskProcessor) {
  judgeTaskProcessor = processor
}

function getWorkerConcurrency() {
  const configured = Number(process.env.JUDGE_WORKER_CONCURRENCY ?? '1')
  return Number.isInteger(configured) && configured > 0 ? configured : 1
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startJudgeWorkerLoop(workerIndex: number) {
  while (true) {
    let workerClient = null as Awaited<ReturnType<typeof createRedisWorkerClient>>

    try {
      workerClient = await createRedisWorkerClient()
      if (!workerClient) {
        await sleep(5_000)
        continue
      }

      console.log(`[judge-worker:${workerIndex}] started`)

      while (true) {
        const task = await dequeueJsonTask<JudgeQueueTask>(workerClient, JUDGE_QUEUE_NAME, 5)
        if (!task) {
          continue
        }

        if (!judgeTaskProcessor) {
          console.warn('[judge-worker] task processor has not been registered yet, task will be skipped')
          continue
        }

        await judgeTaskProcessor(task)
      }
    } catch (error) {
      console.error(`[judge-worker:${workerIndex}] loop error:`, error)
      await sleep(1_000)
    } finally {
      if (workerClient?.isOpen) {
        await workerClient.quit().catch(() => workerClient?.disconnect())
      }
    }
  }
}

// 首次访问提交接口时按需启动后台消费者，兼容 Next.js 自托管 Node 运行模式。
export async function ensureJudgeWorkerStarted() {
  if (global.__ojJudgeWorkerStarted) {
    return
  }

  if (global.__ojJudgeWorkerBootPromise) {
    return global.__ojJudgeWorkerBootPromise
  }

  global.__ojJudgeWorkerBootPromise = (async () => {
    if (!judgeTaskProcessor) {
      return
    }

    const workerClient = await createRedisWorkerClient()
    if (!workerClient) {
      return
    }

    await workerClient.quit().catch(() => workerClient.disconnect())

    const concurrency = getWorkerConcurrency()
    global.__ojJudgeWorkerStarted = true
    for (let index = 0; index < concurrency; index += 1) {
      void startJudgeWorkerLoop(index + 1)
    }
  })().finally(() => {
    global.__ojJudgeWorkerBootPromise = undefined
  })

  return global.__ojJudgeWorkerBootPromise
}