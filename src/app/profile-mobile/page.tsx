'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Button,
  Avatar,
  Space,
  Typography,
  Tag,
  Upload,
  message,
  Spin,
  Card,
  Divider,
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  CameraOutlined,
  SaveOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useI18n, useAuth } from '@/hooks'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { ContributionWall } from '@/components/ContributionWall'
import { MobileLayout } from '@/components/MobileLayout'
import { api, DailyActivity } from '@/lib/api'

const { Text, Title } = Typography
const { TextArea } = Input

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

export default function MobileProfilePage() {
  const { t } = useI18n()
  const router = useRouter()
  const { user, isAuthenticated, updateProfile, uploadAvatar, isLoading, initialized, logout } = useAuth()
  useMobileRedirect()

  const [form] = Form.useForm()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activities, setActivities] = useState<DailyActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/login-mobile')
    }
  }, [initialized, isAuthenticated, router])

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

  const loadActivities = useCallback(async () => {
    if (!user) return
    setActivityLoading(true)
    try {
      const data = await api.getDailyActivity(user.id)
      setActivities(data || [])
    } catch {
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

  return (
    <MobileLayout headerTitle={t('profile.title')}>
      <div style={{ padding: '0' }}>
        {/* Profile header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px 20px',
          textAlign: 'center',
        }}>
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
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                size={80}
                src={getDisplayAvatar()}
                icon={<UserOutlined />}
                style={{
                  border: '3px solid rgba(255,255,255,0.8)',
                  backgroundColor: '#1677ff',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: uploading ? '#999' : '#1677ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: 12,
              }}>
                {uploading ? <Spin size="small" /> : <CameraOutlined />}
              </div>
            </div>
          </Upload>
          <Title level={4} style={{ color: '#fff', margin: '12px 0 4px' }}>{user.username}</Title>
          <Space>
            <Tag color={roleColorMap[user.role] || 'blue'} style={{ margin: 0 }}>
              {getRoleLabel(user.role)}
            </Tag>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {t('profile.joinDate')}: {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </Space>
        </div>

        {/* Avatar picker */}
        <div style={{ padding: '12px 16px 0' }}>
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

        {showAvatarPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ margin: '8px 16px', padding: 12, background: '#f5f5f5', borderRadius: 8 }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
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
                    backgroundColor: selectedAvatar === avatar ? '#e6f4ff' : 'transparent',
                    textAlign: 'center',
                  }}
                >
                  <Avatar size={40} src={avatar} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Edit form */}
        <div style={{ padding: '16px' }}>
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
            <Form form={form} layout="vertical" size="middle">
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
                  style={{ borderRadius: 8 }}
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
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="bio"
                label={t('profile.bio')}
                rules={[{ max: 500, message: t('profile.bioMax') }]}
              >
                <TextArea
                  rows={3}
                  placeholder={t('profile.bioPlaceholder')}
                  showCount
                  maxLength={500}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Form>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving || isLoading}
              onClick={handleSave}
              block
              size="large"
              style={{ borderRadius: 8, marginTop: 8 }}
            >
              {t('profile.save')}
            </Button>
          </Card>
        </div>

        {/* Contribution Wall */}
        <div style={{ padding: '0 16px 16px' }}>
          <Card
            title={
              <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                {t('profile.wall.title')}
              </Title>
            }
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 12 } }}
          >
            <ContributionWall
              activities={activities}
              loading={activityLoading}
            />
          </Card>
        </div>

        {/* Logout */}
        <div style={{ padding: '0 16px 32px' }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            size="large"
            onClick={() => {
              logout()
              router.push('/home-mobile')
            }}
            style={{ borderRadius: 8 }}
          >
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
