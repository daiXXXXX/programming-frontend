'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Form, Input, Button, Tabs, Typography, Divider, Select } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { Code } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAuth, getRoleLabel } from '@/hooks/use-auth'
import { useI18n } from '@/hooks/use-i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
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

export default function LoginPage() {
  const router = useRouter()
  const { login, register, isLoading } = useAuth()
  const { t, language } = useI18n()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loginForm] = Form.useForm<LoginFormValues>()
  const [registerForm] = Form.useForm<RegisterFormValues>()

  const handleLogin = async (values: LoginFormValues) => {
    try {
      await login(values)
      router.push('/')
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
      router.push('/')
    } catch {
      // 错误已在hook中处理
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button icon={<ArrowLeftOutlined />} type="text">
            {language === 'zh' ? '返回首页' : 'Back'}
          </Button>
        </Link>
      </div>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <Card className="shadow-lg" style={{ borderRadius: 12 }}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
              <Code size={24} weight="duotone" className="text-indigo-600" />
            </div>
            <Title level={3} style={{ margin: 0 }}>
              {language === 'zh' ? '编程实验平台' : 'Programming Lab'}
            </Title>
          </div>

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
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={isLoading}
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
                      />
                    </Form.Item>

                    <Form.Item name="role" label={language === 'zh' ? '身份' : 'Role'}>
                      <Select>
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
        
        <div className="text-center mt-4">
          <Text type="secondary" className="text-xs">
            {language === 'zh' ? '登录即表示您同意服务条款' : 'By logging in, you agree to our Terms'}
          </Text>
        </div>
      </motion.div>
    </div>
  )
}
