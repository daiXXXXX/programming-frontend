'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { notification } from 'antd'
import type { WSMessage, WSMessageType } from '@/lib/api'

// WebSocket 连接状态
type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// 事件监听器类型
type WSEventListener = (message: WSMessage) => void

// WebSocket 配置
interface UseWebSocketOptions {
  /** 是否自动连接 */
  autoConnect?: boolean
  /** 是否显示系统通知 */
  showNotifications?: boolean
}

// 获取 WS URL
function getWSUrl(): string {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // 直连后端（Next.js rewrites 不支持 WebSocket 升级）
  const backendHost = process.env.NEXT_PUBLIC_WS_URL || 'localhost:8080'
  return `${protocol}//${backendHost}/api/ws`
}

// 获取 token
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.accessToken || null
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * useWebSocket — 专门处理 WebSocket 连接的 Hook
 * 
 * 核心职责：
 * 1. 管理 WS 连接生命周期（自动连接、断线重连）
 * 2. 解析消息类型，dispatch 不同的事件
 * 3. 提供 subscribe/unsubscribe 频道管理
 * 4. 提供 sendChat 发送聊天消息
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, showNotifications = true } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10
  const listenersRef = useRef<Map<WSMessageType | 'all', Set<WSEventListener>>>(new Map())
  const subscribedChannels = useRef<Set<string>>(new Set())

  const [status, setStatus] = useState<WSStatus>('disconnected')
  const [onlineCount, setOnlineCount] = useState(0)

  // 注册事件监听器
  const on = useCallback((type: WSMessageType | 'all', listener: WSEventListener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type)!.add(listener)

    // 返回取消订阅函数
    return () => {
      listenersRef.current.get(type)?.delete(listener)
    }
  }, [])

  // 移除事件监听器
  const off = useCallback((type: WSMessageType | 'all', listener: WSEventListener) => {
    listenersRef.current.get(type)?.delete(listener)
  }, [])

  // dispatch 事件到对应的监听器
  const dispatch = useCallback((message: WSMessage) => {
    // 按类型 dispatch
    const typeListeners = listenersRef.current.get(message.type)
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(message)
        } catch (e) {
          console.error('[WS] Listener error:', e)
        }
      })
    }

    // 同时 dispatch 给 'all' 监听器
    const allListeners = listenersRef.current.get('all')
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener(message)
        } catch (e) {
          console.error('[WS] Listener error:', e)
        }
      })
    }
  }, [])

  // 处理收到的消息 — 按类型分情况处理
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      // 服务端可能一次发送多条消息（用换行分隔）
      const messages = event.data.split('\n').filter(Boolean)
      
      for (const raw of messages) {
        const message: WSMessage = JSON.parse(raw)

        switch (message.type) {
          case 'system_notice':
            // 系统通知：弹出全局通知
            if (showNotifications) {
              notification.info({
                message: '系统通知',
                description: message.content?.message || String(message.content),
                placement: 'topRight',
                duration: 5,
              })
            }
            dispatch(message)
            break

          case 'new_comment':
            // 新评论：dispatch 给订阅的组件更新评论列表
            dispatch(message)
            break

          case 'new_solution':
            // 新题解：dispatch 给订阅的组件刷新题解列表
            dispatch(message)
            break

          case 'like_notify':
            // 点赞通知：弹出提示
            if (showNotifications && message.from) {
              notification.success({
                message: '收到点赞',
                description: `${message.from.username} 点赞了你的题解`,
                placement: 'topRight',
                duration: 3,
              })
            }
            dispatch(message)
            break

          case 'online_count':
            // 在线人数更新
            setOnlineCount(message.content?.count || 0)
            dispatch(message)
            break

          case 'judge_result':
            // 评测结果：dispatch 给订阅的组件更新提交状态
            dispatch(message)
            break

          case 'chat':
            // 聊天消息：dispatch 给订阅的组件
            dispatch(message)
            break

          default:
            // 未知类型也 dispatch 出去
            dispatch(message)
        }
      }
    } catch (e) {
      console.error('[WS] Failed to parse message:', e)
    }
  }, [dispatch, showNotifications])

  // 建立 WebSocket 连接
  const connect = useCallback(() => {
    const token = getToken()
    if (!token) {
      console.log('[WS] No token, skip connection')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const url = getWSUrl()
    if (!url) return

    setStatus('connecting')

    try {
      // 通过 URL query 传递 token（WebSocket 不支持自定义 header）
      // 但我们后端用的是 Gin middleware 从 Authorization header 读取
      // 所以这里通过 subprotocol 传递 token
      const ws = new WebSocket(url, [token])

      ws.onopen = () => {
        console.log('[WS] Connected')
        setStatus('connected')
        reconnectAttempts.current = 0

        // 重新订阅之前的频道
        subscribedChannels.current.forEach(channel => {
          ws.send(JSON.stringify({ action: 'subscribe', channel }))
        })
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason)
        setStatus('disconnected')
        wsRef.current = null

        // 自动重连（指数退避）
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
          reconnectTimerRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
        setStatus('error')
      }

      wsRef.current = ws
    } catch (e) {
      console.error('[WS] Connection failed:', e)
      setStatus('error')
    }
  }, [handleMessage])

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    reconnectAttempts.current = maxReconnectAttempts // 阻止重连
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    setStatus('disconnected')
  }, [])

  // 订阅频道
  const subscribe = useCallback((channel: string) => {
    subscribedChannels.current.add(channel)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', channel }))
    }
  }, [])

  // 取消订阅频道
  const unsubscribe = useCallback((channel: string) => {
    subscribedChannels.current.delete(channel)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'unsubscribe', channel }))
    }
  }, [])

  // 发送聊天消息
  const sendChat = useCallback((channel: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'chat',
        channel,
        content,
      }))
    }
  }, [])

  // 自动连接和清理
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    return () => {
      disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  return {
    status,
    onlineCount,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendChat,
    on,
    off,
  }
}
