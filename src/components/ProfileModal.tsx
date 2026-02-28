'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, Avatar, Space, Typography, Divider, Tag, Upload, message, Spin } from 'antd'
import { UserOutlined, MailOutlined, EditOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons'
import { User } from '@/store/authStore'
import { useI18n } from '@/hooks'

const { Text, Title } = Typography
const { TextArea } = Input

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  user: User
  onUpdateProfile: (data: { username: string; email: string; avatar: string; bio: string }) => Promise<unknown>
  onUploadAvatar?: (file: File) => Promise<{ avatar: string; message: string }>
  isLoading?: boolean
}

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

export function ProfileModal({ open, onClose, user, onUpdateProfile, onUploadAvatar, isLoading }: ProfileModalProps) {
  const { t } = useI18n()
  const [form] = Form.useForm()
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        bio: user.bio || '',
      })
      setSelectedAvatar(user.avatar || '')
      setShowAvatarPicker(false)
    }
  }, [open, user, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await onUpdateProfile({
        username: values.username,
        email: values.email,
        avatar: selectedAvatar,
        bio: values.bio || '',
      })
      onClose()
    } catch (err) {
      // form validation error or api error, handled elsewhere
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
    // 使用用户名生成默认头像
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${user.username}`
  }

  const getRoleLabel = (role: string) => {
    return t(`profile.role.${role}`)
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={null}
      footer={null}
      width={520}
      destroyOnClose
      styles={{
        body: { padding: '0' },
      }}
    >
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px 24px 48px',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          {t('profile.title')}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
          {t('profile.subtitle')}
        </Text>
      </div>

      {/* Avatar Section - overlapping the banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: -40,
        position: 'relative',
        zIndex: 1,
      }}>
        <Upload
          name="avatar"
          showUploadList={false}
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          beforeUpload={async (file) => {
            // 验证文件大小 (最大2MB)
            if (file.size > 2 * 1024 * 1024) {
              message.error(t('profile.avatarTooLarge') || '头像文件大小不能超过2MB')
              return false
            }
            // 如果有上传回调，直接上传
            if (onUploadAvatar) {
              setUploading(true)
              try {
                const result = await onUploadAvatar(file)
                setSelectedAvatar(result.avatar)
              } catch {
                // error handled in hook
              } finally {
                setUploading(false)
              }
            } else {
              // 回退: 转为 base64 预览
              const reader = new FileReader()
              reader.onload = () => {
                setSelectedAvatar(reader.result as string)
              }
              reader.readAsDataURL(file)
            }
            return false // 阻止默认上传
          }}
        >
          <div
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <Avatar
              size={80}
              src={getDisplayAvatar()}
              icon={<UserOutlined />}
              style={{
                border: '4px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
      </div>

      {/* Avatar Picker - 预设头像选择 */}
      <div style={{ textAlign: 'center', padding: '8px 24px 0' }}>
        <Button
          type="link"
          size="small"
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          style={{ fontSize: 12 }}
        >
          {showAvatarPicker ? t('profile.hidePresetAvatars') || '收起预设头像' : t('profile.showPresetAvatars') || '选择预设头像'}
        </Button>
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <div style={{
          margin: '12px 24px',
          padding: '16px',
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

      {/* User Role & Join Date */}
      <div style={{ textAlign: 'center', padding: '8px 24px 0' }}>
        <Space>
          <Tag color={roleColorMap[user.role] || 'blue'}>
            {getRoleLabel(user.role)}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('profile.joinDate')}: {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Form */}
      <div style={{ padding: '0 24px 24px' }}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving || isLoading}
            onClick={handleSave}
          >
            {t('profile.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
