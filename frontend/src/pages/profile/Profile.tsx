import { useState, useEffect } from 'react'
import { Card, Typography, Form, Input, Button, message, Descriptions, Divider, Tag } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { getCurrentUser } from '../../services/authService'
import axios from '@/utils/axios'

const { Title } = Typography

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function Profile() {
  const [user, setUser] = useState(getCurrentUser())
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const roleLabels: Record<string, string> = {
    leader: '主管',
    sales: '销售',
    admin: '管理员',
  }
  const getRoleLabel = (role: string) => roleLabels[role] || role

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

  const handleChangePassword = async (values: ChangePasswordForm) => {
    setLoading(true)
    try {
      await axios.put(
        `${API_BASE_URL}/users/change-password`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        })
      message.success('密码修改成功')
      form.resetFields()
    } catch (error: any) {
      message.error(error.response?.data?.error || '修改密码失败')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Typography.Text>用户未登录</Typography.Text>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>个人资料</Title>

        <Descriptions bordered column={2} style={{ marginTop: 24 }}>
          <Descriptions.Item label="用户名" span={2}>
            <UserOutlined style={{ marginRight: 8 }} />
            {user.username}
          </Descriptions.Item>

          <Descriptions.Item label="邮箱" span={2}>
            <MailOutlined style={{ marginRight: 8 }} />
            {user.email}
          </Descriptions.Item>

          <Descriptions.Item label="姓名" span={2}>
            {user.name || '-'}
          </Descriptions.Item>

          <Descriptions.Item label="角色" span={2}>
            <Tag color={user.role === 'leader' ? 'gold' : 'blue'}>
              {getRoleLabel(user.role)}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="用户ID" span={2}>
            <Typography.Text code>{user.id}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Title level={4}>修改密码</Title>

        <Form
          form={form}
          name="changePassword"
          onFinish={handleChangePassword}
          layout="vertical"
          style={{ maxWidth: 500, marginTop: 24 }}
        >
          <Form.Item
            label="当前密码"
            name="currentPassword"
            rules={[
              { required: true, message: '请输入当前密码' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入当前密码"
            />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少 8 个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
