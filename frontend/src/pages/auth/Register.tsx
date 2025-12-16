import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { register, login, RegisterData } from '../../services/authService'

const { Title, Text } = Typography

export default function Register() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleSubmit = async (values: RegisterData & { confirmPassword: string }) => {
    setLoading(true)
    try {
      // Register user
      const { confirmPassword, ...registerData } = values
      await register(registerData)
      message.success('注册成功')

      // Auto login after registration
      await login({
        email: registerData.email,
        password: registerData.password
      })

      message.success('自动登录成功，正在跳转...')
      navigate('/workspace')
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '注册失败'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
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
          maxWidth: 440,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          border: '1px solid #f0f0f0'
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: '0 0 8px', color: '#1f1f1f', fontWeight: 600 }}>
            用户注册
          </Title>
          <Text type="secondary">创建您的账户</Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 20, message: '用户名长度需为2-20个字符' }
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入用户名"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' }
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入邮箱"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入姓名（可选）"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8个字符' }
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入密码"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请再次输入密码"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 24 }}>
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
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              已经有账号？{' '}
              <Button
                type="link"
                onClick={() => navigate('/login')}
                style={{ padding: 0, color: '#1f1f1f', fontWeight: 600 }}
              >
                立即登录
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  )
}
