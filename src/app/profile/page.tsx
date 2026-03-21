'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Button,
  Avatar,
  Space,
  Typography,
  Divider,
  Tag,
  Upload,
  message,
  Spin,
  Card,
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  CameraOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useI18n, useAuth } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { ContributionWall } from '@/components/ContributionWall'
import { api, DailyActivity } from '@/lib/api'

const { Text, Title } = Typography
const { TextArea } = Input

// 预设头像列表
const PRESET_AVATARS = [
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Lily',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Bella',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Sam',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Charlie',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Mia',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/9.x/adventurer/svg?seed=Nala',
]

const roleColorMap: Record<string, string> = {
  student: 'blue',
  instructor: 'green',
  admin: 'red',
}

export default function ProfilePage() {
  const { t } = useI18n()
  const router = useRouter()
  const { user, isAuthenticated, updateProfile, uploadAvatar, isLoading, initialized } = useAuth()
  useMobileRedirect()

  const [form] = Form.useForm()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activities, setActivities] = useState<DailyActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  // 未登录则跳转登录页
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/login')
    }
  }, [initialized, isAuthenticated, router])

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        bio: user.bio || '',
      })
      setSelectedAvatar(user.avatar || '')
    }
  }, [user, form])

  // 加载活动数据
  const loadActivities = useCallback(async () => {
    if (!user) return
    setActivityLoading(true)
    try {
      const data = await api.getDailyActivity(user.id)
      setActivities(data || [])
    } catch {
      // 静默处理错误
      setActivities([])
    } finally {
      setActivityLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadActivities()
    }
  }, [user, loadActivities])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await updateProfile({
        username: values.username,
        email: values.email,
        avatar: selectedAvatar,
        bio: values.bio || '',
      })
      message.success(t('common.success'))
    } catch {
      // form validation error or api error
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl)
    setShowAvatarPicker(false)
  }

  const getDisplayAvatar = () => {
    if (selectedAvatar) return selectedAvatar
    if (user?.username) {
      return `https://api.dicebear.com/9.x/adventurer/svg?seed=${user.username}`
    }
    return ''
  }

  const getRoleLabel = (role: string) => {
    return t(`profile.role.${role}`)
  }

  if (!initialized || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 只有学生账号展示班级信息，避免给教师和管理员显示无意义的空字段。
  const shouldShowClassInfo = user.role === 'student'
  const displayClassName = user.className?.trim() || t('profile.classUnassigned')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px 24px 80px',
        position: 'relative',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Link href="/workspace">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}
            >
              {t('profile.backToWorkspace')}
            </Button>
          </Link>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            {t('profile.title')}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            {t('profile.subtitle')}
          </Text>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 960, margin: '-48px auto 0', padding: '0 24px 48px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Profile Card */}
          <Card
            style={{ borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}
          >
            {/* Avatar section */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24,
              padding: '32px 32px 0',
            }}>
              {/* Avatar upload */}
              <Upload
                name="avatar"
                showUploadList={false}
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                beforeUpload={async (file) => {
                  if (file.size > 2 * 1024 * 1024) {
                    message.error(t('profile.avatarTooLarge') || '头像文件大小不能超过2MB')
                    return false
                  }
                  setUploading(true)
                  try {
                    const result = await uploadAvatar(file)
                    setSelectedAvatar(result.avatar)
                  } catch {
                    // error handled in hook
                  } finally {
                    setUploading(false)
                  }
                  return false
                }}
              >
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                  <Avatar
                    size={96}
                    src={getDisplayAvatar()}
                    icon={<UserOutlined />}
                    style={{
                      border: '4px solid #fff',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                      backgroundColor: '#1677ff',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: uploading ? '#999' : '#1677ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    color: '#fff',
                    fontSize: 14,
                  }}>
                    {uploading ? <Spin size="small" /> : <CameraOutlined />}
                  </div>
                </div>
              </Upload>

              {/* User info summary */}
              <div style={{ flex: 1, paddingTop: 8 }}>
                <Title level={4} style={{ margin: 0 }}>{user.username}</Title>
                <Space style={{ marginTop: 8 }}>
                  <Tag color={roleColorMap[user.role] || 'blue'}>
                    {getRoleLabel(user.role)}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('profile.joinDate')}: {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </Space>
                {user.bio && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
                    {user.bio}
                  </Text>
                )}
              </div>
            </div>

            {/* Avatar picker toggle */}
            <div style={{ textAlign: 'left', padding: '12px 32px 0' }}>
              <Button
                type="link"
                size="small"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                style={{ fontSize: 12, padding: 0 }}
              >
                {showAvatarPicker
                  ? (t('profile.hidePresetAvatars') || '收起预设头像')
                  : (t('profile.showPresetAvatars') || '选择预设头像')}
              </Button>
            </div>

            {/* Avatar picker grid */}
            {showAvatarPicker && (
              <div style={{
                margin: '12px 32px',
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
              }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                  {t('profile.selectAvatar')}
                </Text>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 8,
                }}>
                  {PRESET_AVATARS.map((avatar, index) => (
                    <div
                      key={index}
                      onClick={() => handleAvatarSelect(avatar)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 8,
                        padding: 4,
                        border: selectedAvatar === avatar ? '2px solid #1677ff' : '2px solid transparent',
                        transition: 'all 0.2s',
                        backgroundColor: selectedAvatar === avatar ? '#e6f4ff' : 'transparent',
                      }}
                    >
                      <Avatar
                        size={48}
                        src={avatar}
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <Input
                    size="small"
                    placeholder={t('profile.avatarUrlPlaceholder')}
                    value={selectedAvatar}
                    onChange={(e) => setSelectedAvatar(e.target.value)}
                    allowClear
                  />
                </div>
              </div>
            )}

            <Divider style={{ margin: '16px 0' }} />

            {/* Edit form */}
            <div style={{ padding: '0 32px 32px' }}>
              <Form
                form={form}
                layout="vertical"
                size="middle"
              >
                <Form.Item
                  name="username"
                  label={t('profile.username')}
                  rules={[
                    { required: true, message: t('profile.usernameRequired') },
                    { min: 3, message: t('profile.usernameMin') },
                    { max: 50, message: t('profile.usernameMax') },
                    { pattern: /^[a-zA-Z0-9_]+$/, message: t('profile.usernamePattern') },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder={t('profile.usernamePlaceholder')}
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  label={t('profile.email')}
                  rules={[
                    { required: true, message: t('profile.emailRequired') },
                    { type: 'email', message: t('profile.emailInvalid') },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder={t('profile.emailPlaceholder')}
                  />
                </Form.Item>

                {/* 班级信息由后端返回，仅用于学生查看，不允许在个人资料页直接编辑。 */}
                {shouldShowClassInfo && (
                  <Form.Item label={t('profile.classInfo')}>
                    <Input
                      value={displayClassName}
                      placeholder={t('profile.classInfoPlaceholder')}
                      readOnly
                      disabled
                    />
                  </Form.Item>
                )}

                <Form.Item
                  name="bio"
                  label={t('profile.bio')}
                  rules={[
                    { max: 500, message: t('profile.bioMax') },
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder={t('profile.bioPlaceholder')}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              </Form>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving || isLoading}
                  onClick={handleSave}
                  size="large"
                >
                  {t('profile.save')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Contribution Wall Card */}
          <Card
            title={
              <Title level={5} style={{ margin: 0 }}>
                {t('profile.wall.title')}
              </Title>
            }
            style={{ borderRadius: 12 }}
          >
            <ContributionWall
              activities={activities}
              loading={activityLoading}
            />
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
