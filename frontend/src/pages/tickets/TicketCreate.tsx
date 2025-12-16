import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Distributor {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  role: string
}

export default function TicketCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [form] = Form.useForm()

  const fetchDistributors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors`, {
        params: {
          page: 1,
          limit: 1000,
        },
      })

      if (response.data.success) {
        setDistributors(response.data.distributors)
      }
    } catch (error: any) {
      console.error('Failed to fetch distributors:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: {
          page: 1,
          limit: 1000,
        },
      })

      if (response.data.success) {
        setUsers(response.data.users)
      }
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
    }
  }

  useEffect(() => {
    fetchDistributors()
    fetchUsers()
  }, [])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets`, values)

      if (response.data.ticket) {
        message.success('创建成功')
        navigate('/tickets')
      }
    } catch (error: any) {
      console.error('Failed to create ticket:', error)
      message.error(error.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="新建工单"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            ticketType: 'technical',
            priority: 'medium',
          }}
        >
          <Form.Item
            name="distributorId"
            label="分销商"
            rules={[{ required: true, message: '请选择分销商' }]}
          >
            <Select
              showSearch
              placeholder="选择分销商"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {distributors.map((dist) => (
                <Option key={dist.id} value={dist.id}>
                  {dist.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="工单标题"
            rules={[{ required: true, message: '请输入工单标题' }]}
          >
            <Input placeholder="请输入工单标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="问题描述"
            rules={[{ required: true, message: '请输入问题描述' }]}
          >
            <TextArea rows={6} placeholder="请详细描述问题..." />
          </Form.Item>

          <Form.Item
            name="ticketType"
            label="工单类型"
            rules={[{ required: true, message: '请选择工单类型' }]}
          >
            <Select placeholder="选择工单类型">
              <Option value="technical">技术支持</Option>
              <Option value="product">产品咨询</Option>
              <Option value="billing">账单问题</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择优先级">
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>

          <Form.Item name="assignedTo" label="指派给">
            <Select
              showSearch
              placeholder="选择处理人（可选）"
              allowClear
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate('/tickets')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
