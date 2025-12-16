import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from '@/utils/axios'
import { login, LoginData } from '../../services/authService'

const { Title, Text } = Typography
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const FeishuIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
    <path
      d="M9.6 4.1 3.4 13.5c-.7 1 .1 2.4 1.3 2.4h5.8l4.5-6.5-4.1-5.3c-.3-.4-1-.4-1.3 0Z"
      fillOpacity=".7"
    />
    <path
      d="M14.4 19.9 20.6 10.5c.7-1-.1-2.4-1.3-2.4h-5.8l-4.5 6.5 4.1 5.3c.3.4 1 .4 1.3 0Z"
    />
  </svg>
)

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [feishuLoading, setFeishuLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm()

  useEffect(() => {
    const checkFeishuCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (!code) return

      // Use sessionStorage to prevent duplicate requests across StrictMode re-mounts
      const processedCode = sessionStorage.getItem('feishu_processed_code')
      if (processedCode === code) {
        setSearchParams({})
        return
      }

      const savedState = localStorage.getItem('feishu_auth_state')


      if (!state || state !== savedState) {
        if (!savedState && state) {
          setSearchParams({})
          return
        }
        message.error('登录验证失败：状态不匹配')
        setSearchParams({})
        localStorage.removeItem('feishu_auth_state')
        return
      }

      // Mark as processed BEFORE any async operation
      sessionStorage.setItem('feishu_processed_code', code)
      localStorage.removeItem('feishu_auth_state')

      try {
        setFeishuLoading(true)
        message.loading({ content: '正在通过飞书登录...', key: 'feishuLogin' })

        const response = await axios.post(
          `${API_BASE_URL}/auth/feishu/login`,
          { code },
          { withCredentials: true }
        )

        const { user } = response.data
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
        }

        message.success({ content: '飞书登录成功', key: 'feishuLogin' })
        sessionStorage.removeItem('feishu_processed_code')
        navigate('/workspace')
      } catch (error: any) {
        console.error('Feishu login error:', error)
        const errorMsg = error.response?.data?.error || '飞书登录失败，请重试'
        message.error({ content: errorMsg, key: 'feishuLogin' })
        sessionStorage.removeItem('feishu_processed_code')
        setSearchParams({})
      } finally {
        setFeishuLoading(false)
      }
    }

    checkFeishuCallback()
  }, [searchParams, setSearchParams, navigate])

  const handleSubmit = async (values: LoginData) => {
    setLoading(true)
    try {
      await login(values)
      message.success('登录成功')
      navigate('/workspace')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '登录失败'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleFeishuLogin = () => {
    const appId = import.meta.env.VITE_FEISHU_APP_ID

    if (!appId) {
      message.error('未配置飞书 App ID')
      return
    }

    // Generate secure random state (compatible with HTTP)
    const array = new Uint8Array(16)
    window.crypto.getRandomValues(array)
    const state = Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('feishu_auth_state', state)

    const redirectUri = window.location.href.split('?')[0]


    const authUrl = `https://passport.feishu.cn/suite/passport/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`

    window.location.href = authUrl
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f7fa',
      padding: 20
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          border: '1px solid #f0f0f0'
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: '0 0 8px', color: '#1f1f1f', fontWeight: 600 }}>
            用户登录
          </Title>
          <Text type="secondary">渠道管理系统</Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '邮箱格式不正确' }
            ]}
            style={{ marginBottom: 20 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入邮箱"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8个字符' }
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入密码"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 44,
                borderRadius: 6,
                backgroundColor: '#1f1f1f',
                borderColor: '#1f1f1f',
                fontWeight: 500
              }}
            >
              登录
            </Button>
          </Form.Item>

          <Divider plain style={{ margin: '24px 0', color: '#8c8c8c', fontSize: 12 }}>
            或
          </Divider>

          <Form.Item style={{ marginBottom: 24 }}>
            <Button
              onClick={handleFeishuLogin}
              loading={feishuLoading}
              block
              style={{
                height: 44,
                borderRadius: 6,
                backgroundColor: '#3370ff',
                borderColor: '#3370ff',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 500
              }}
              icon={<FeishuIcon />}
            >
              飞书一键登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              还没有账号？{' '}
              <Button
                type="link"
                onClick={() => navigate('/register')}
                style={{ padding: 0, color: '#1f1f1f', fontWeight: 600 }}
              >
                立即注册
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  )
}
