'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Form, Input, Button, Tabs, Typography, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { Code } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAuth, getRoleLabel } from '@/hooks/use-auth'
import { useI18n } from '@/hooks/use-i18n'
import { useMobileRedirect } from '@/hooks/use-mobile'
import { UserRole } from '@/store/authStore'

const { Title, Text } = Typography

interface LoginFormValues {
  username: string
  password: string
}

interface RegisterFormValues {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
}

export default function MobileLoginPage() {
  const router = useRouter()
  const { login, register, isLoading } = useAuth()
  const { t, language } = useI18n()
  useMobileRedirect()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loginForm] = Form.useForm<LoginFormValues>()
  const [registerForm] = Form.useForm<RegisterFormValues>()

  const handleLogin = async (values: LoginFormValues) => {
    try {
      await login(values)
      router.push('/home-mobile')
    } catch {
      // 错误已在hook中处理
    }
  }

  const handleRegister = async (values: RegisterFormValues) => {
    try {
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
      })
      router.push('/home-mobile')
    } catch {
      // 错误已在hook中处理
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f2ff 0%, #f5f5f5 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-start' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          type="text" 
          onClick={() => router.push('/home-mobile')}
        >
          {language === 'zh' ? '返回' : 'Back'}
        </Button>
      </div>

      {/* Logo area */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          background: '#eef2ff',
          borderRadius: '50%',
          marginBottom: 12,
        }}>
          <Code size={28} weight="duotone" style={{ color: '#4f46e5' }} />
        </div>
        <Title level={4} style={{ margin: 0 }}>
          {language === 'zh' ? '编程实验平台' : 'Programming Lab'}
        </Title>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '0 16px', flex: 1 }}
      >
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: '20px 16px' } }}>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'login' | 'register')}
            centered
            size="small"
            items={[
              {
                key: 'login',
                label: language === 'zh' ? '登录' : 'Login',
                children: (
                  <Form
                    form={loginForm}
                    onFinish={handleLogin}
                    layout="vertical"
                    size="large"
                  >
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: language === 'zh' ? '请输入用户名或邮箱' : 'Please enter username or email' },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder={language === 'zh' ? '用户名或邮箱' : 'Username or Email'}
                        autoComplete="username"
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: language === 'zh' ? '请输入密码' : 'Please enter password' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder={language === 'zh' ? '密码' : 'Password'}
                        autoComplete="current-password"
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={isLoading}
                        style={{ borderRadius: 10, height: 48, fontSize: 16 }}
                      >
                        {language === 'zh' ? '登录' : 'Login'}
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: language === 'zh' ? '注册' : 'Register',
                children: (
                  <Form
                    form={registerForm}
                    onFinish={handleRegister}
                    layout="vertical"
                    initialValues={{ role: 'student' }}
                    size="large"
                  >
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: language === 'zh' ? '请输入用户名' : 'Please enter username' },
                        { min: 3, message: language === 'zh' ? '用户名至少3个字符' : 'Min 3 characters' },
                        { pattern: /^[a-zA-Z0-9_]+$/, message: language === 'zh' ? '只能包含字母、数字和下划线' : 'Letters, numbers, underscores only' },
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder={language === 'zh' ? '用户名' : 'Username'}
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: language === 'zh' ? '请输入邮箱' : 'Please enter email' },
                        { type: 'email', message: language === 'zh' ? '邮箱格式不正确' : 'Invalid email' },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder={language === 'zh' ? '邮箱' : 'Email'}
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: language === 'zh' ? '请输入密码' : 'Please enter password' },
                        { min: 6, message: language === 'zh' ? '密码至少6个字符' : 'Min 6 characters' },
                        { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: language === 'zh' ? '需包含大小写字母和数字' : 'Need upper, lower, number' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder={language === 'zh' ? '密码' : 'Password'}
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: language === 'zh' ? '请确认密码' : 'Confirm password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve()
                            }
                            return Promise.reject(new Error(language === 'zh' ? '密码不一致' : 'Passwords do not match'))
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder={language === 'zh' ? '确认密码' : 'Confirm Password'}
                        style={{ borderRadius: 10, height: 48 }}
                      />
                    </Form.Item>

                    <Form.Item name="role" label={language === 'zh' ? '身份' : 'Role'}>
                      <Select style={{ borderRadius: 10 }}>
                        <Select.Option value="student">{getRoleLabel('student')}</Select.Option>
                        <Select.Option value="instructor">{getRoleLabel('instructor')}</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={isLoading}
                        style={{ borderRadius: 10, height: 48, fontSize: 16 }}
                      >
                        {language === 'zh' ? '注册' : 'Register'}
                      </Button>
                    </Form.Item>
                  </Form>
                ),
              },
            ]}
          />
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16, paddingBottom: 32 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {language === 'zh' ? '登录即表示您同意服务条款' : 'By logging in, you agree to our Terms'}
          </Text>
        </div>
      </motion.div>
    </div>
  )
}
