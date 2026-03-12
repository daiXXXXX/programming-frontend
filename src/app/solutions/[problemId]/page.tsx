'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Card, Button, Typography, Space, Tag, Empty, Spin, Select, 
  Avatar, Input, Modal, message, Pagination
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  LikeOutlined,
  LikeFilled,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { api, Solution } from '@/lib/api'
import { useI18n, useAuth, useWebSocket } from '@/hooks'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function SolutionsPage() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const problemId = Number(params.problemId)
  const { isAuthenticated, user } = useAuth()
  const ws = useWebSocket({ autoConnect: isAuthenticated })

  const [solutions, setSolutions] = useState<Solution[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState('newest')
  const [page, setPage] = useState(1)
  const [problemTitle, setProblemTitle] = useState('')
  const pageSize = 20

  // 创建题解弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createContent, setCreateContent] = useState('')
  const [creating, setCreating] = useState(false)

  const loadSolutions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getSolutions(problemId, order, pageSize, (page - 1) * pageSize)
      setSolutions(res.solutions || [])
      setTotal(res.total)
    } catch (e) {
      console.error('Failed to load solutions:', e)
    } finally {
      setLoading(false)
    }
  }, [problemId, order, page])

  // 加载题目标题
  useEffect(() => {
    api.getProblem(problemId).then(p => setProblemTitle(p.title)).catch(() => {})
  }, [problemId])

  useEffect(() => {
    loadSolutions()
  }, [loadSolutions])

  // 订阅 WS 频道获取新题解通知
  useEffect(() => {
    const channel = `problem:${problemId}`
    ws.subscribe(channel)
    const unsub = ws.on('new_solution', () => {
      loadSolutions()
    })
    return () => {
      ws.unsubscribe(channel)
      unsub()
    }
  }, [problemId, ws])

  const handleCreate = async () => {
    if (!createTitle.trim() || !createContent.trim()) {
      message.warning(t('solutions.fillRequired'))
      return
    }
    setCreating(true)
    try {
      await api.createSolution({
        problemId,
        title: createTitle,
        content: createContent,
      })
      message.success(t('solutions.createSuccess'))
      setCreateOpen(false)
      setCreateTitle('')
      setCreateContent('')
      loadSolutions()
    } catch (e: any) {
      message.error(e.message || t('solutions.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleLike = async (e: React.MouseEvent, sol: Solution) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      message.warning(t('solutions.loginToLike'))
      return
    }
    try {
      const res = await api.toggleSolutionLike(sol.id)
      setSolutions(prev =>
        prev.map(s =>
          s.id === sol.id ? { ...s, liked: res.liked, likeCount: res.likeCount } : s
        )
      )
    } catch (e) {
      console.error('Failed to toggle like:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              {t('common.back')}
            </Button>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {t('solutions.title')}
              </Title>
              {problemTitle && (
                <Text type="secondary" className="text-sm">{problemTitle}</Text>
              )}
            </div>
          </Space>
          <Space>
            <Select
              value={order}
              onChange={v => { setOrder(v); setPage(1) }}
              style={{ width: 120 }}
              options={[
                { value: 'newest', label: t('solutions.sortNewest') },
                { value: 'likes', label: t('solutions.sortLikes') },
                { value: 'views', label: t('solutions.sortViews') },
              ]}
            />
            {isAuthenticated && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                {t('solutions.write')}
              </Button>
            )}
          </Space>
        </div>

        {/* 题解列表 */}
        <Spin spinning={loading}>
          {solutions.length === 0 && !loading ? (
            <Card>
              <Empty description={t('solutions.empty')}>
                {isAuthenticated && (
                  <Button type="primary" onClick={() => setCreateOpen(true)}>
                    {t('solutions.writeFirst')}
                  </Button>
                )}
              </Empty>
            </Card>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {solutions.map((sol, idx) => (
                  <motion.div
                    key={sol.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      hoverable
                      onClick={() => router.push(`/solutions/${problemId}/${sol.id}`)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          src={sol.author?.avatar}
                          icon={<UserOutlined />}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Title level={5} style={{ margin: 0 }} ellipsis>
                              {sol.title}
                            </Title>
                          </div>
                          <Text type="secondary" className="text-xs">
                            {sol.author?.username} · {format(new Date(sol.createdAt), 'yyyy-MM-dd HH:mm')}
                          </Text>
                          <Paragraph
                            type="secondary"
                            className="text-sm mt-2 mb-0"
                            ellipsis={{ rows: 2 }}
                          >
                            {sol.content.replace(/[#*`>_~\[\]()]/g, '').slice(0, 200)}
                          </Paragraph>
                          <div className="flex items-center gap-4 mt-3">
                            <span
                              className="flex items-center gap-1 text-xs cursor-pointer hover:text-blue-500"
                              onClick={(e) => handleLike(e, sol)}
                            >
                              {sol.liked ? (
                                <LikeFilled style={{ color: '#1677ff' }} />
                              ) : (
                                <LikeOutlined />
                              )}
                              {sol.likeCount}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MessageOutlined /> {sol.commentCount}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <EyeOutlined /> {sol.viewCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {total > pageSize && (
            <div className="flex justify-center mt-6">
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </Spin>

        {/* 创建题解弹窗 */}
        <Modal
          title={t('solutions.createTitle')}
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onOk={handleCreate}
          confirmLoading={creating}
          okText={t('solutions.publish')}
          cancelText={t('common.cancel')}
          width={720}
        >
          <div className="space-y-4">
            <div>
              <Text strong>{t('solutions.titleLabel')}</Text>
              <Input
                value={createTitle}
                onChange={e => setCreateTitle(e.target.value)}
                placeholder={t('solutions.titlePlaceholder')}
                maxLength={200}
                className="mt-1"
              />
            </div>
            <div>
              <Text strong>{t('solutions.contentLabel')}</Text>
              <Text type="secondary" className="text-xs ml-2">
                {t('solutions.markdownSupport')}
              </Text>
              <TextArea
                value={createContent}
                onChange={e => setCreateContent(e.target.value)}
                placeholder={t('solutions.contentPlaceholder')}
                rows={12}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
