'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card, Button, Typography, Space, Avatar, Input, Divider, Spin,
  Popconfirm, message, Tag, Empty, Modal, Tooltip
} from 'antd'
import {
  ArrowLeftOutlined,
  LikeOutlined,
  LikeFilled,
  EyeOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { api, Solution, SolutionComment } from '@/lib/api'
import { useI18n, useAuth, useWebSocket } from '@/hooks'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
})

function renderMarkdown(content: string): string {
  if (typeof window === 'undefined') return content
  const raw = marked.parse(content) as string
  return DOMPurify.sanitize(raw)
}

// ==================== 评论组件 ====================

interface CommentItemProps {
  comment: SolutionComment
  currentUserId: number | null
  onReply: (commentId: number, username: string) => void
  onDelete: (commentId: number) => void
  t: (key: string) => string
  depth?: number
}

function CommentItem({ comment, currentUserId, onReply, onDelete, t, depth = 0 }: CommentItemProps) {
  const maxDepth = 3

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex items-start gap-3 py-3">
        <Avatar
          src={comment.author?.avatar}
          icon={<UserOutlined />}
          size={depth > 0 ? 28 : 32}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Text strong className="text-sm">{comment.author?.username}</Text>
            <Text type="secondary" className="text-xs">
              {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
            </Text>
          </div>
          <div className="text-sm mt-1 text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </div>
          <div className="flex items-center gap-4 mt-1">
            {depth < maxDepth && (
              <Button
                type="text"
                size="small"
                className="text-xs text-gray-400 px-0"
                onClick={() => onReply(comment.id, comment.author?.username || '')}
              >
                {t('solutions.reply')}
              </Button>
            )}
            {currentUserId === comment.userId && (
              <Popconfirm
                title={t('solutions.deleteCommentConfirm')}
                onConfirm={() => onDelete(comment.id)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  className="text-xs px-0"
                >
                  {t('solutions.delete')}
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </div>

      {/* 子评论 */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== 主页面 ====================

export default function SolutionDetailPage() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const problemId = Number(params.problemId)
  const solutionId = Number(params.solutionId)
  const { isAuthenticated, user } = useAuth()
  const ws = useWebSocket({ autoConnect: isAuthenticated })

  const [solution, setSolution] = useState<Solution | null>(null)
  const [comments, setComments] = useState<SolutionComment[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)

  // 评论输入
  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef<any>(null)

  // 编辑模式
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [updating, setUpdating] = useState(false)

  const currentUserId = user?.id || null

  const loadSolution = useCallback(async () => {
    try {
      const sol = await api.getSolution(solutionId)
      setSolution(sol)
    } catch (e) {
      console.error('Failed to load solution:', e)
      message.error(t('solutions.loadError'))
    }
  }, [solutionId, t])

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await api.getSolutionComments(solutionId, 100, 0)
      setComments(res.comments || [])
      setCommentTotal(res.total)
    } catch (e) {
      console.error('Failed to load comments:', e)
    } finally {
      setCommentsLoading(false)
    }
  }, [solutionId])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadSolution(), loadComments()])
      setLoading(false)
    }
    init()
  }, [loadSolution, loadComments])

  // 订阅 WS 频道接收实时评论
  useEffect(() => {
    const channel = `solution:${solutionId}`
    ws.subscribe(channel)

    const unsubComment = ws.on('new_comment', () => {
      loadComments()
    })
    const unsubLike = ws.on('like_notify', (msg) => {
      // 如果是当前题解被点赞，刷新数据
      if (msg.content?.solutionId === solutionId) {
        loadSolution()
      }
    })

    return () => {
      ws.unsubscribe(channel)
      unsubComment()
      unsubLike()
    }
  }, [solutionId, ws, loadComments, loadSolution])

  const handleLike = async () => {
    if (!isAuthenticated) {
      message.warning(t('solutions.loginToLike'))
      return
    }
    try {
      const res = await api.toggleSolutionLike(solutionId)
      setSolution(prev =>
        prev ? { ...prev, liked: res.liked, likeCount: res.likeCount } : prev
      )
    } catch (e) {
      console.error('Failed to toggle like:', e)
    }
  }

  const handleReply = (commentId: number, username: string) => {
    setReplyTo({ id: commentId, username })
    commentInputRef.current?.focus()
  }

  const handleCancelReply = () => {
    setReplyTo(null)
  }

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      message.warning(t('solutions.commentEmpty'))
      return
    }
    if (!isAuthenticated) {
      message.warning(t('solutions.loginToComment'))
      return
    }

    setSubmittingComment(true)
    try {
      await api.createComment(solutionId, {
        content: commentContent,
        parentId: replyTo?.id || null,
      })
      setCommentContent('')
      setReplyTo(null)
      await loadComments()
      // 更新评论数
      setSolution(prev =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      )
    } catch (e: any) {
      message.error(e.message || t('solutions.commentFailed'))
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.deleteComment(commentId)
      message.success(t('solutions.commentDeleted'))
      await loadComments()
      setSolution(prev =>
        prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev
      )
    } catch (e: any) {
      message.error(e.message || t('solutions.deleteFailed'))
    }
  }

  const handleEdit = () => {
    if (!solution) return
    setEditTitle(solution.title)
    setEditContent(solution.content)
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      message.warning(t('solutions.fillRequired'))
      return
    }
    setUpdating(true)
    try {
      await api.updateSolution(solutionId, {
        title: editTitle,
        content: editContent,
      })
      message.success(t('solutions.updateSuccess'))
      setEditOpen(false)
      loadSolution()
    } catch (e: any) {
      message.error(e.message || t('solutions.updateFailed'))
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteSolution(solutionId)
      message.success(t('solutions.deleteSuccess'))
      router.push(`/solutions/${problemId}`)
    } catch (e: any) {
      message.error(e.message || t('solutions.deleteFailed'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!solution) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Empty description={t('solutions.notFound')}>
          <Button onClick={() => router.back()}>{t('common.back')}</Button>
        </Empty>
      </div>
    )
  }

  const isAuthor = currentUserId === solution.userId

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/solutions/${problemId}`)}
          >
            {t('solutions.backToList')}
          </Button>
          {isAuthor && (
            <Space>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                {t('solutions.edit')}
              </Button>
              <Popconfirm
                title={t('solutions.deleteConfirm')}
                onConfirm={handleDelete}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button danger icon={<DeleteOutlined />}>
                  {t('solutions.delete')}
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>

        {/* 题解正文 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            {/* 作者信息 */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                src={solution.author?.avatar}
                icon={<UserOutlined />}
                size={48}
              />
              <div>
                <Text strong>{solution.author?.username}</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  {format(new Date(solution.createdAt), 'yyyy-MM-dd HH:mm')}
                  {solution.updatedAt !== solution.createdAt && (
                    <span> · {t('solutions.edited')}</span>
                  )}
                </Text>
              </div>
            </div>

            <Title level={3}>{solution.title}</Title>

            {/* Markdown 渲染区域 */}
            <div
              className="prose prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(solution.content) }}
            />

            <Divider />

            {/* 底部操作栏 */}
            <div className="flex items-center gap-6">
              <Tooltip title={isAuthenticated ? '' : t('solutions.loginToLike')}>
                <Button
                  type="text"
                  icon={solution.liked ? <LikeFilled style={{ color: '#1677ff' }} /> : <LikeOutlined />}
                  onClick={handleLike}
                  className={solution.liked ? 'text-blue-500' : ''}
                >
                  {solution.likeCount}
                </Button>
              </Tooltip>
              <span className="flex items-center gap-1 text-gray-500">
                <MessageOutlined /> {solution.commentCount}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <EyeOutlined /> {solution.viewCount}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* 评论区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            title={
              <span>
                {t('solutions.comments')} ({commentTotal})
              </span>
            }
            className="mt-4"
          >
            {/* 评论输入框 */}
            {isAuthenticated ? (
              <div className="mb-4">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-2">
                    <Tag closable onClose={handleCancelReply}>
                      {t('solutions.replyTo')} @{replyTo.username}
                    </Tag>
                  </div>
                )}
                <div className="flex gap-3">
                  <Avatar
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    size={32}
                  />
                  <div className="flex-1">
                    <TextArea
                      ref={commentInputRef}
                      value={commentContent}
                      onChange={e => setCommentContent(e.target.value)}
                      placeholder={
                        replyTo
                          ? `${t('solutions.replyTo')} @${replyTo.username}...`
                          : t('solutions.commentPlaceholder')
                      }
                      rows={2}
                      autoSize={{ minRows: 2, maxRows: 6 }}
                      onPressEnter={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          handleSubmitComment()
                        }
                      }}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Text type="secondary" className="text-xs">
                        {t('solutions.commentTip')}
                      </Text>
                      <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        loading={submittingComment}
                        disabled={!commentContent.trim()}
                        onClick={handleSubmitComment}
                      >
                        {t('solutions.send')}
                      </Button>
                    </div>
                  </div>
                </div>
                <Divider />
              </div>
            ) : (
              <div className="text-center py-3 mb-4">
                <Text type="secondary">{t('solutions.loginToComment')}</Text>
              </div>
            )}

            {/* 评论列表 */}
            <Spin spinning={commentsLoading}>
              {comments.length === 0 ? (
                <Empty
                  description={t('solutions.noComments')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {comments.map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </Spin>
          </Card>
        </motion.div>

        {/* 编辑弹窗 */}
        <Modal
          title={t('solutions.editTitle')}
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={handleUpdate}
          confirmLoading={updating}
          okText={t('solutions.save')}
          cancelText={t('common.cancel')}
          width={720}
        >
          <div className="space-y-4">
            <div>
              <Text strong>{t('solutions.titleLabel')}</Text>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
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
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
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
