import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Descriptions,
  Spin,
  message,
  Modal,
  Select,
  Input,
  List,
  Avatar,
  Divider,
  Badge
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  CommentOutlined,
  SendOutlined,
  SwapOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import axios from '@/utils/axios'
import { formatRegion } from '@/utils/regionUtils'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline: string
  createdAt: string
  updatedAt: string
  distributor?: {
    id: string
    name: string
    region: string
  }
  assignedUser?: {
    id: string
    username: string
  }
  collaborators?: Array<{ id: string; username: string }>
  comments?: Array<{
    id: string
    content: string
    createdAt: string
    user: { id: string; username: string }
  }>
}

const priorityColors: Record<string, string> = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
  urgent: 'magenta',
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

const statusColors: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
  overdue: 'error',
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期',
}

export function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [newComment, setNewComment] = useState('')
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [newStatus, setNewStatus] = useState<Task['status'] | ''>('')

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setTask(null)

    const fetchTask = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/tasks/${id}`)
        if (isMounted) {
          // 后端返回 { task }，无 success 字段
          setTask(response.data.task)
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('获取任务详情失败:', error)
          message.error(error.response?.data?.error || '获取任务详情失败')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    if (id) {
      fetchTask()
    }
    return () => { isMounted = false }
  }, [id])

  const handleStatusChange = async () => {
    if (task && newStatus) {
      try {
        await axios.put(`${API_BASE_URL}/tasks/${id}/status`, { status: newStatus })
        setTask(prev => prev ? { ...prev, status: newStatus } : null)
        message.success('状态更新成功')
        setStatusModalVisible(false)
      } catch (error: any) {
        message.error(error.response?.data?.error || '状态更新失败')
      }
    }
  }

  const handleAddComment = async () => {
    if (task && newComment.trim()) {
      try {
        const response = await axios.post(`${API_BASE_URL}/tasks/${id}/comments`, {
          content: newComment
        })
        // 后端返回 { comment }，无 success 字段
        if (response.data.comment) {
          setTask(prev => prev ? {
            ...prev,
            comments: [...(prev.comments || []), response.data.comment]
          } : null)
          setNewComment('')
          message.success('评论已添加')
        }
      } catch (error: any) {
        message.error(error.response?.data?.error || '添加评论失败')
      }
    }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: '删除任务',
      content: '确定要删除该任务吗？',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          // 后端需要 confirm=true 参数
          await axios.delete(`${API_BASE_URL}/tasks/${id}?confirm=true`)
          message.success('任务已删除')
          navigate('/workspace')
        } catch (error: any) {
          message.error(error.response?.data?.error || '删除失败')
        }
      }
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={4}>未找到该任务</Title>
        <Button onClick={() => navigate('/workspace')}>返回工作台</Button>
      </div>
    )
  }

  const isOverdue = dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'completed'

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
          返回
        </Button>
      </Space>

      <Card>
        {/* Title and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
              <Badge status={statusColors[task.status] as any} text={statusLabels[task.status]} />
            </Space>
            <Title level={3} style={{ margin: 0 }}>{task.title}</Title>
          </div>
          <Space>
            <Button icon={<SwapOutlined />} onClick={() => setStatusModalVisible(true)}>
              更改状态
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/tasks/${id}/edit`)}>
              编辑
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除
            </Button>
          </Space>
        </div>

        {/* Description */}
        <Paragraph style={{ fontSize: 16, marginBottom: 24 }}>
          {task.description}
        </Paragraph>

        <Divider />

        {/* Details */}
        <Descriptions column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="截止时间">
            <Text type={isOverdue ? 'danger' : undefined}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
              {isOverdue && '（已逾期）'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="指派给">
            <UserOutlined style={{ marginRight: 8 }} />
            {task.assignedUser?.username || '未指派'}
          </Descriptions.Item>
          <Descriptions.Item label="关联经销商">
            {task.distributor ? (
              <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/distributors/${task.distributor?.id}`)}>
                {task.distributor.name}
              </Button>
            ) : (
              '暂无'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="区域">
            {task.distributor?.region ? formatRegion(task.distributor.region) : '暂无'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        {/* Collaborators */}
        {task.collaborators && task.collaborators.length > 0 && (
          <>
            <Divider orientation="left">协作成员</Divider>
            <Space>
              {task.collaborators.map(collab => (
                <Tag key={collab.id} icon={<UserOutlined />}>{collab.username}</Tag>
              ))}
            </Space>
          </>
        )}

        {/* Comments */}
        <Divider orientation="left">
          <CommentOutlined style={{ marginRight: 8 }} />
          评论（{task.comments?.length || 0}）
        </Divider>

        <List
          dataSource={task.comments}
          locale={{ emptyText: '暂无评论' }}
          renderItem={comment => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <Text strong>{comment.user.username}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(comment.createdAt).format('MM-DD HH:mm')}
                    </Text>
                  </Space>
                }
                description={comment.content}
              />
            </List.Item>
          )}
        />

        {/* Add Comment */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <TextArea
            rows={2}
            placeholder="请输入评论..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAddComment}
            disabled={!newComment.trim()}
          >
            发送
          </Button>
        </div>
      </Card>

      {/* Status Change Modal */}
      <Modal
        title="更改任务状态"
        open={statusModalVisible}
        onOk={handleStatusChange}
        onCancel={() => setStatusModalVisible(false)}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="请选择新的状态"
          value={newStatus || task.status}
          onChange={setNewStatus}
          options={[
            { label: '待处理', value: 'pending' },
            { label: '进行中', value: 'in_progress' },
            { label: '已完成', value: 'completed' }
          ]}
        />
      </Modal>
    </div>
  )
}

export default TaskDetail
