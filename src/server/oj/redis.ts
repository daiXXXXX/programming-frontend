import 'server-only'

import { createClient } from 'redis'

type OJRedisClient = ReturnType<typeof createClient>

// 通过全局单例复用 Redis 客户端，避免开发模式热更新时重复建立连接。
declare global {
  var __ojRedisClient: OJRedisClient | undefined
  var __ojRedisConnectPromise: Promise<OJRedisClient | null> | undefined
  var __ojRedisRetryAfter: number | undefined
  var __ojRedisDidLogReady: boolean | undefined
}

const REDIS_RETRY_INTERVAL_MS = 30_000
const REDIS_PREFIX = (process.env.REDIS_PREFIX ?? 'oj-next').trim() || 'oj-next'

function isRedisDisabledByEnv() {
  const flag = String(process.env.REDIS_ENABLED ?? '').trim().toLowerCase()
  return flag === '0' || flag === 'false' || flag === 'off'
}

function buildRedisUrl() {
  if (process.env.REDIS_URL?.trim()) {
    return process.env.REDIS_URL.trim()
  }

  const host = process.env.REDIS_HOST?.trim() || '127.0.0.1'
  const port = Number(process.env.REDIS_PORT ?? '6379')
  return `redis://${host}:${port}`
}

// 统一拼接业务 key，避免不同服务各自维护前缀规则。
export function buildRedisKey(...parts: Array<string | number>) {
  return [REDIS_PREFIX, ...parts.map((part) => String(part))].join(':')
}

async function connectRedisClient() {
  const client = createClient({
    url: buildRedisUrl(),
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    database: Number(process.env.REDIS_DB ?? '0'),
    socket: {
      reconnectStrategy: false,
    },
  })

  client.on('error', (error) => {
    console.error('[oj-redis] Redis client error:', error)
  })

  await client.connect()

  if (!global.__ojRedisDidLogReady) {
    global.__ojRedisDidLogReady = true
    console.log('[oj-redis] Redis connected')
  }

  return client
}

// 统一获取 Redis 客户端；连接失败时进入短暂冷却，避免每个请求都重复打日志。
export async function getRedisClient() {
  if (isRedisDisabledByEnv()) {
    return null
  }

  if (global.__ojRedisClient?.isOpen) {
    return global.__ojRedisClient
  }

  if (global.__ojRedisRetryAfter && Date.now() < global.__ojRedisRetryAfter) {
    return null
  }

  if (!global.__ojRedisConnectPromise) {
    global.__ojRedisConnectPromise = connectRedisClient()
      .then((client) => {
        global.__ojRedisClient = client
        global.__ojRedisRetryAfter = undefined
        return client
      })
      .catch((error) => {
        global.__ojRedisClient = undefined
        global.__ojRedisRetryAfter = Date.now() + REDIS_RETRY_INTERVAL_MS
        console.warn('[oj-redis] Redis unavailable, fallback to direct database mode:', error)
        return null
      })
      .finally(() => {
        global.__ojRedisConnectPromise = undefined
      })
  }

  return global.__ojRedisConnectPromise
}

// Worker 使用独立阻塞连接，避免 `BRPOP` 长时间占用共享客户端。
export async function createRedisWorkerClient() {
  const baseClient = await getRedisClient()
  if (!baseClient) {
    return null
  }

  const workerClient = baseClient.duplicate()
  workerClient.on('error', (error) => {
    console.error('[oj-redis] Redis worker client error:', error)
  })
  await workerClient.connect()
  return workerClient
}

// 读取 JSON 缓存时统一处理反序列化失败，避免坏数据影响主流程。
export async function getCachedJson<T>(...parts: Array<string | number>): Promise<T | null> {
  const client = await getRedisClient()
  if (!client) {
    return null
  }

  const raw = await client.get(buildRedisKey(...parts))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('[oj-redis] Failed to parse cached JSON, deleting corrupted key:', error)
    await client.del(buildRedisKey(...parts))
    return null
  }
}

// 写入 JSON 缓存时统一加 TTL，便于排行榜等热点接口快速复用。
export async function setCachedJson(value: unknown, ttlSeconds: number, ...parts: Array<string | number>) {
  const client = await getRedisClient()
  if (!client) {
    return false
  }

  const key = buildRedisKey(...parts)
  const payload = JSON.stringify(value)

  if (ttlSeconds > 0) {
    await client.setEx(key, ttlSeconds, payload)
  } else {
    await client.set(key, payload)
  }

  return true
}

// 精确删除单个缓存 key，适合详情缓存或固定 key 的失效处理。
export async function deleteCachedKey(...parts: Array<string | number>) {
  const client = await getRedisClient()
  if (!client) {
    return 0
  }

  return client.del(buildRedisKey(...parts))
}

// 模糊删除热点 key，适合排行榜这类 limit 可变的缓存集合。
export async function deleteCachedKeysByPattern(...parts: Array<string | number>) {
  const client = await getRedisClient()
  if (!client) {
    return 0
  }

  const matchedKeys: string[] = []
  for await (const key of client.scanIterator({ MATCH: buildRedisKey(...parts) })) {
    matchedKeys.push(String(key))
  }

  if (!matchedKeys.length) {
    return 0
  }

  return client.del(matchedKeys)
}

// 统一将评测任务入队，调用方只需关心业务对象本身。
export async function enqueueJsonTask(queueName: string, task: unknown) {
  const client = await getRedisClient()
  if (!client) {
    return false
  }

  await client.lPush(buildRedisKey(queueName), JSON.stringify(task))
  return true
}

// 阻塞读取 Redis 队列，统一兼容不同返回结构并完成 JSON 反序列化。
export async function dequeueJsonTask<T>(client: OJRedisClient, queueName: string, timeoutSeconds: number): Promise<T | null> {
  const reply = await client.sendCommand(['BRPOP', buildRedisKey(queueName), String(timeoutSeconds)])
  if (!reply || !Array.isArray(reply) || reply.length < 2) {
    return null
  }

  return JSON.parse(String(reply[1])) as T
}