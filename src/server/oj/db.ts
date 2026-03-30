import 'server-only'

import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

// 复用全局连接池，避免 Next.js 开发模式热更新时重复创建数据库连接。
declare global {
  var __ojMysqlPool: Pool | undefined
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function createPool() {
  return mysql.createPool({
    host: requireEnv('DB_HOST', '127.0.0.1'),
    port: Number(requireEnv('DB_PORT', '3306')),
    user: requireEnv('DB_USER', 'root'),
    password: requireEnv('DB_PASSWORD', ''),
    database: requireEnv('DB_NAME'),
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    dateStrings: false,
  })
}

function getOrCreatePool() {
  if (!global.__ojMysqlPool) {
    global.__ojMysqlPool = createPool()
  }

  return global.__ojMysqlPool
}

// 使用惰性代理创建连接池，避免在构建阶段因为缺少数据库环境变量而直接报错。
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const realPool = getOrCreatePool()
    return Reflect.get(realPool, prop, receiver)
  },
})

// 简化查询调用，统一返回行数组。
export async function queryRows<T extends RowDataPacket[]>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.query<T>(sql, params)
  return rows
}

// 简化写操作调用，统一返回影响行数和插入 ID。
export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as any[])
  return result
}

// 需要事务时使用该助手，保证提交/回滚逻辑集中处理。
export async function withTransaction<T>(handler: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await handler(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export type DBConnection = PoolConnection
export type DBResult = ResultSetHeader
