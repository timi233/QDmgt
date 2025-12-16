import { useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Tag, Button, Space, Empty, Spin, Badge, List, Avatar, Progress, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  UserOutlined,
  CalendarOutlined,
  RightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import axios from '@/utils/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const { Title, Text } = Typography

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline: string
  distributor?: {
    id: string
    name: string
  }
  assignedUser?: {
    id: string
    username: string
  }
}

const priorityColors: Record<string, string> = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
  urgent: 'magenta'
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
}

const statusColors: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
  overdue: 'error'
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期'
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'completed'
  const deadlineText = dayjs(task.deadline).format('MM-DD HH:mm')
  const isToday = dayjs(task.deadline).isSame(dayjs(), 'day')
  const isTomorrow = dayjs(task.deadline).isSame(dayjs().add(1, 'day'), 'day')

  let deadlineLabel = deadlineText
  if (isToday) deadlineLabel = `今天 ${dayjs(task.deadline).format('HH:mm')}`
  if (isTomorrow) deadlineLabel = `明天 ${dayjs(task.deadline).format('HH:mm')}`

  return (
    <Card
      hoverable
      size="small"
      onClick={onClick}
      style={{ marginBottom: 12 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
          <Badge status={statusColors[task.status] as any} text={statusLabels[task.status]} />
        </Space>

        <Text strong style={{ fontSize: 14 }}>{task.title}</Text>

        {task.distributor && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <UserOutlined /> {task.distributor.name}
          </Text>
        )}

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
            <CalendarOutlined /> {deadlineLabel}
          </Text>
          <RightOutlined style={{ color: '#999', fontSize: 12 }} />
        </Space>
      </Space>
    </Card>
  )
}

const { TextArea } = Input

export function Workspace() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [distributors, setDistributors] = useState<Array<{ id: string; name: string }>>([])
  const [form] = Form.useForm()

  const fetchTasks = async (isMounted = true) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`)
      if (isMounted && response.data.success) {
        setTasks(response.data.tasks || [])
      }
    } catch (error: any) {
      if (isMounted) {
        console.error('获取任务列表失败:', error)
        message.error('获取任务列表失败')
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  const fetchDistributors = async (isMounted = true) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors`, {
        params: { page: 1, limit: 100 }
      })
      if (isMounted && response.data.success) {
        setDistributors(response.data.distributors)
      }
    } catch (error: any) {
      if (isMounted) {
        console.error('获取经销商列表失败:', error)
      }
    }
  }

  useEffect(() => {
    let isMounted = true
    fetchTasks(isMounted)
    fetchDistributors(isMounted)
    return () => { isMounted = false }
  }, [])

  interface CreateTaskFormData {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    deadline: dayjs.Dayjs
    distributorId?: string
  }

  const handleCreateTask = async (values: CreateTaskFormData) => {
    setSubmitting(true)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tasks`,
        {
          ...values,
          deadline: values.deadline.toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      if (response.data.success) {
        message.success('任务创建成功!')
        setCreateModalVisible(false)
        form.resetFields()
        fetchTasks()
      } else {
        message.error(response.data.error || '创建任务失败')
      }
    } catch (error: any) {
      console.error('创建任务失败:', error)
      message.error(error.response?.data?.error || '创建任务失败')
    } finally {
      setSubmitting(false)
    }
  }

  // Categorize tasks
  const urgentTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    (t.priority === 'urgent' || t.status === 'overdue' || dayjs(t.deadline).isBefore(dayjs().add(4, 'hour')))
  )
  const todayTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    !urgentTasks.includes(t) &&
    dayjs(t.deadline).isSame(dayjs(), 'day')
  )
  const upcomingTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    !urgentTasks.includes(t) &&
    !todayTasks.includes(t)
  )
  const completedTasks = tasks.filter(t => t.status === 'completed')

  // Stats
  const totalTasks = tasks.length
  const completedCount = completedTasks.length
  const overdueCount = tasks.filter(t => t.status === 'overdue').length
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>我的工作台</Title>
          <Text type="secondary">管理任务并跟踪进度</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            新建任务
          </Button>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">总任务数</Text>
            <Title level={3} style={{ margin: '8px 0 0' }}>{totalTasks}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">已完成</Text>
            <Title level={3} style={{ margin: '8px 0 0', color: '#52c41a' }}>{completedCount}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">已逾期</Text>
            <Title level={3} style={{ margin: '8px 0 0', color: '#ff4d4f' }}>{overdueCount}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">完成率</Text>
            <Progress percent={completionRate} size="small" style={{ marginTop: 8 }} />
          </Card>
        </Col>
      </Row>

      {/* Task Columns */}
      <Row gutter={16}>
        {/* Urgent Column */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>紧急任务 ({urgentTasks.length})</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: 12, maxHeight: 400, overflowY: 'auto' } }}
          >
            {urgentTasks.length === 0 ? (
              <Empty description="暂无紧急任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              urgentTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
              ))
            )}
          </Card>
        </Col>

        {/* Today Column */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#faad14' }} />
                <span>今日任务 ({todayTasks.length})</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: 12, maxHeight: 400, overflowY: 'auto' } }}
          >
            {todayTasks.length === 0 ? (
              <Empty description="暂无今日任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              todayTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
              ))
            )}
          </Card>
        </Col>

        {/* Upcoming Column */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1890ff' }} />
                <span>即将到期 ({upcomingTasks.length})</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
            styles={{ body: { padding: 12, maxHeight: 400, overflowY: 'auto' } }}
          >
            {upcomingTasks.length === 0 ? (
              <Empty description="暂无即将到期的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              upcomingTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>最近完成 ({completedTasks.length})</span>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <List
            dataSource={completedTasks.slice(0, 5)}
            renderItem={task => (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<CheckCircleOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                  title={task.title}
                  description={task.distributor?.name}
                />
                <Text type="secondary">{dayjs(task.deadline).format('MM-DD')}</Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 创建任务模态框 */}
      <Modal
        title="新建任务"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            priority: 'medium',
            deadline: dayjs().add(1, 'day')
          }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[
              { required: true, message: '请输入任务标题' },
              { min: 2, message: '标题至少需要2个字符' },
              { max: 100, message: '标题不能超过100个字符' }
            ]}
          >
            <Input placeholder="输入任务标题" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
            rules={[
              { required: true, message: '请输入任务描述' },
              { min: 10, message: '描述至少需要10个字符' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="描述任务详情..."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="distributorId"
            label="关联经销商"
          >
            <Select
              placeholder="选择经销商(可选)"
              allowClear
              showSearch
              optionFilterProp="children"
              options={distributors.map(d => ({
                value: d.id,
                label: d.name
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select
                  options={[
                    { value: 'low', label: '低' },
                    { value: 'medium', label: '中' },
                    { value: 'high', label: '高' },
                    { value: 'urgent', label: '紧急' }
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="deadline"
                label="截止时间"
                rules={[{ required: true, message: '请选择截止时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  disabledDate={current => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                创建任务
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Workspace
