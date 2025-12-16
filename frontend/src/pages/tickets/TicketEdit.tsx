import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Spin, Popconfirm } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'

const { TextArea } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface User {
  id: string
  name: string
  role: string
}

export default function TicketEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [form] = Form.useForm()

  const fetchTicket = async () => {
    setFetchLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/tickets/${id}`)

      if (response.data.success) {
        const ticket = response.data.ticket
        form.setFieldsValue(ticket)
      }
    } catch (error: any) {
      console.error('Failed to fetch ticket:', error)
      message.error(error.response?.data?.error || '获取工单详情失败')
    } finally {
      setFetchLoading(false)
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
    fetchTicket()
    fetchUsers()
  }, [id])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}/tickets/${id}`, values)

      if (response.data.ticket) {
        message.success('更新成功')
        navigate(`/tickets/${id}`)
      }
    } catch (error: any) {
      console.error('Failed to update ticket:', error)
      message.error(error.response?.data?.error || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/tickets/${id}`)
      message.success('工单删除成功')
      navigate('/tickets')
    } catch (error: any) {
      console.error('Failed to delete ticket:', error)
      message.error(error.response?.data?.error || '删除失败')
    }
  }

  if (fetchLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="编辑工单"
        extra={
          <Space>
            <Popconfirm
              title="确定要删除这个工单吗？"
              description="删除后将无法恢复"
              onConfirm={handleDelete}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
              返回列表
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="open">待处理</Option>
              <Option value="assigned">已分配</Option>
              <Option value="in_progress">处理中</Option>
              <Option value="pending">等待中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="closed">已关闭</Option>
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

          <Form.Item name="resolution" label="解决方案">
            <TextArea rows={4} placeholder="请输入解决方案（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(`/tickets/${id}`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
