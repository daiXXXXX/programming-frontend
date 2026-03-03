'use client'

import { ReactNode, useState, useEffect } from 'react'
import { Layout, Menu, Typography, Avatar, Dropdown, Button, Spin, Result } from 'antd'
import {
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Code } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, getRoleLabel } from '@/hooks'
import { useI18n } from '@/hooks'
import { ProfileModal } from '@/components/ProfileModal'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { user, isAuthenticated, isInstructor, isAdmin, logout, updateProfile, uploadAvatar, isLoading, initialized } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // 等待认证初始化
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 权限校验：只有教师或管理员可进入
  if (!isAuthenticated || !user || (!isInstructor && !isAdmin)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status="403"
          title="403"
          subTitle={t('manager.noPermission')}
          extra={
            <Link href="/">
              <Button type="primary">{t('manager.backHome')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const menuItems = [
    {
      key: '/manager/my-classes',
      icon: <TeamOutlined />,
      label: <Link href="/manager/my-classes">{t('manager.myClasses')}</Link>,
    },
  ]

  // 根据当前路径确定选中的菜单项
  const selectedKey = menuItems.find(item => pathname.startsWith(item.key))?.key || '/manager/my-classes'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
        }}
        trigger={null}
        width={220}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid #f0f0f0',
          gap: 8,
        }}>
          <Code size={28} weight="duotone" style={{ color: '#4f46e5', flexShrink: 0 }} />
          {!collapsed && (
            <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {t('manager.title')}
            </Title>
          )}
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout>
        {/* 顶部导航 */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/workspace">
              <Button type="text" icon={<HomeOutlined />}>
                {t('manager.backToWorkspace')}
              </Button>
            </Link>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'user-info',
                    label: (
                      <div style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 500 }}>{user.username}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{getRoleLabel(user.role)}</div>
                      </div>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'profile',
                    icon: <EditOutlined />,
                    label: t('profile.title'),
                    onClick: () => setProfileModalOpen(true),
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: t('common.logout'),
                    onClick: logout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
                className="hover:bg-gray-100"
              >
                <Avatar
                  size="small"
                  src={user.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${user.username}`}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1677ff' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{user.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content style={{
          margin: 24,
          minHeight: 'calc(100vh - 64px - 48px)',
        }}>
          {children}
        </Content>
      </Layout>

      {/* 个人信息弹窗 */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onUpdateProfile={updateProfile}
        onUploadAvatar={uploadAvatar}
        isLoading={isLoading}
      />
    </Layout>
  )
}
