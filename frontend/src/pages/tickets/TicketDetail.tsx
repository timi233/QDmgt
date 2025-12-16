import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  message,
  Spin,
  List,
  Avatar,
  Input,
  Form,
  Checkbox,
  Divider,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { TextArea } = Input

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Ticket {
  id: string
  ticketNumber: string
  distributorId: string
  ticketType: 'technical' | 'product' | 'billing' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  subject: string
  description: string
  assignedTo: string | null
  resolution: string | null
  createdBy: string
  createdAt: string
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  resolutionTime: number | null
  distributor?: {
    id: string
    name: string
    region: string
    contactPerson: string
    phone: string
  }
  creator?: {
    id: string
    username: string
    name: string
  }
  assignee?: {
    id: string
    username: string
    name: string
  } | null
  comments?: Comment[]
}

interface Comment {
  id: string
  ticketId: string
  userId: string
  content: string
  isInternal: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    name: string
  }
}

const ticketTypeMap: Record<string, { text: string; color: string }> = {
  technical: { text: '技术支持', color: 'blue' },
  product: { text: '产品咨询', color: 'green' },
  billing: { text: '账单问题', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const priorityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'default' },
  medium: { text: '中', color: 'blue' },
  high: { text: '高', color: 'orange' },
  urgent: { text: '紧急', color: 'red' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  open: { text: '待处理', color: 'default' },
  assigned: { text: '已分配', color: 'cyan' },
  in_progress: { text: '处理中', color: 'processing' },
  pending: { text: '等待中', color: 'warning' },
  resolved: { text: '已解决', color: 'success' },
  closed: { text: '已关闭', color: 'default' },
}

export default function TicketDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchTicket = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/tickets/${id}`)

      if (response.data.success) {
        setTicket(response.data.ticket)
      }
    } catch (error: any) {
      console.error('Failed to fetch ticket:', error)
      message.error(error.response?.data?.error || '获取工单详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  const handleAddComment = async (values: any) => {
    setCommentLoading(true)
    try {
      await axios.post(`${API_BASE_URL}/tickets/comments`, {
        ticketId: id,
        content: values.content,
        isInternal: values.isInternal || false,
      })
      message.success('评论添加成功')
      form.resetFields()
      fetchTicket()
    } catch (error: any) {
      console.error('Failed to add comment:', error)
      message.error(error.response?.data?.error || '添加评论失败')
    } finally {
      setCommentLoading(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
              返回
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tickets/${id}/edit`)}
            >
              编辑
            </Button>
          </Space>
        </Card>

        <Card title="工单信息">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="工单号" span={2}>
              {ticket.ticketNumber}
            </Descriptions.Item>
            <Descriptions.Item label="标题" span={2}>
              {ticket.subject}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {ticket.description}
            </Descriptions.Item>
            <Descriptions.Item label="分销商" span={2}>
              {ticket.distributor?.name} ({ticket.distributor?.region})
              {ticket.distributor?.contactPerson && (
                <>
                  <br />
                  联系人: {ticket.distributor.contactPerson}
                  {ticket.distributor.phone && ` - ${ticket.distributor.phone}`}
                </>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="工单类型">
              <Tag color={ticketTypeMap[ticket.ticketType]?.color}>
                {ticketTypeMap[ticket.ticketType]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={priorityMap[ticket.priority]?.color}>
                {priorityMap[ticket.priority]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[ticket.status]?.color}>
                {statusMap[ticket.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建人">{ticket.creator?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="处理人">
              {ticket.assignee?.name || '未分配'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {ticket.firstResponseAt && (
              <Descriptions.Item label="首次响应时间">
                {dayjs(ticket.firstResponseAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {ticket.resolvedAt && (
              <>
                <Descriptions.Item label="解决时间">
                  {dayjs(ticket.resolvedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="解决耗时">
                  {ticket.resolutionTime ? `${ticket.resolutionTime} 分钟` : '-'}
                </Descriptions.Item>
              </>
            )}
            {ticket.closedAt && (
              <Descriptions.Item label="关闭时间">
                {dayjs(ticket.closedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {ticket.resolution && (
              <Descriptions.Item label="解决方案" span={2}>
                {ticket.resolution}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title={`评论 (${ticket.comments?.length || 0})`}>
          <List
            dataSource={ticket.comments || []}
            renderItem={(comment) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <span>{comment.user.name}</span>
                      {comment.isInternal && <Tag color="orange">内部</Tag>}
                      <span style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </Space>
                  }
                  description={comment.content}
                />
              </List.Item>
            )}
          />

          <Divider />

          <Form form={form} onFinish={handleAddComment} layout="vertical">
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入评论内容' }]}
            >
              <TextArea
                rows={4}
                placeholder="输入评论内容..."
                disabled={commentLoading}
              />
            </Form.Item>

            <Form.Item name="isInternal" valuePropName="checked">
              <Checkbox>内部评论（仅团队可见）</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={commentLoading}
              >
                发送评论
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  )
}
