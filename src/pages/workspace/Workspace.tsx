import React, { useEffect, useState } from 'react'
import {
  Layout,
  Row,
  Col,
  Typography,
  Input,
  Select,
  Button,
  Spin,
  Empty,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { TaskCard } from '../../components/TaskCard/TaskCard'
import { getTasks } from '../../services/taskService'
import type { Task, TaskFilters } from '../../types/task'
import './Workspace.css'

const { Title, Text } = Typography
const { Content } = Layout
const { Option } = Select

interface TasksByStatus {
  urgent: Task[]
  today: Task[]
  upcoming: Task[]
}

export const Workspace: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadTasks()
  }, [filters])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const result = await getTasks(1, 100, filters)
      setTasks(result.tasks)
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setFilters({ ...filters, search: searchText })
  }

  const handleStatusFilter = (status: string | undefined) => {
    setFilters({ ...filters, status })
  }

  const handlePriorityFilter = (priority: string | undefined) => {
    setFilters({ ...filters, priority })
  }

  const handleRefresh = () => {
    loadTasks()
  }

  const handleCreateTask = () => {
    navigate('/tasks/create')
  }

  // Group tasks by urgency and deadline
  const groupTasks = (): TasksByStatus => {
    const now = new Date()
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const urgent: Task[] = []
    const todayTasks: Task[] = []
    const upcoming: Task[] = []

    tasks.forEach((task) => {
      const deadline = new Date(task.deadline)

      // Overdue or urgent priority
      if (
        task.status === 'overdue' ||
        task.priority === 'urgent' ||
        deadline < now
      ) {
        urgent.push(task)
      }
      // Due today
      else if (deadline <= today) {
        todayTasks.push(task)
      }
      // Upcoming
      else {
        upcoming.push(task)
      }
    })

    return { urgent, today: todayTasks, upcoming }
  }

  const { urgent, today, upcoming } = groupTasks()

  return (
    <Layout className="workspace-layout">
      <Content className="workspace-content">
        <div className="workspace-header">
          <Title level={2}>工作台</Title>
          <Text type="secondary">管理您的任务和协作</Text>
        </div>

        {/* Filters */}
        <div className="workspace-filters">
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="搜索任务标题或描述"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="状态"
                allowClear
                style={{ width: '100%' }}
                onChange={handleStatusFilter}
              >
                <Option value="pending">待处理</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="overdue">逾期</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="优先级"
                allowClear
                style={{ width: '100%' }}
                onChange={handlePriorityFilter}
              >
                <Option value="urgent">紧急</Option>
                <Option value="high">高</Option>
                <Option value="medium">中</Option>
                <Option value="low">低</Option>
              </Select>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTask}
                style={{ marginLeft: 8 }}
              >
                新建任务
              </Button>
            </Col>
          </Row>
        </div>

        {/* Task Groups */}
        <Spin spinning={loading}>
          <Row gutter={24} className="workspace-task-groups">
            {/* Urgent Tasks */}
            <Col span={8}>
              <div className="task-group">
                <div className="task-group-header urgent">
                  <Title level={4}>
                    紧急任务
                    <Text type="danger" style={{ marginLeft: 8 }}>
                      ({urgent.length})
                    </Text>
                  </Title>
                  <Text type="secondary">逾期或紧急优先级</Text>
                </div>
                <div className="task-group-content">
                  {urgent.length > 0 ? (
                    urgent.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <Empty
                      description="暂无紧急任务"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              </div>
            </Col>

            {/* Today's Tasks */}
            <Col span={8}>
              <div className="task-group">
                <div className="task-group-header today">
                  <Title level={4}>
                    今日任务
                    <Text type="warning" style={{ marginLeft: 8 }}>
                      ({today.length})
                    </Text>
                  </Title>
                  <Text type="secondary">今天截止</Text>
                </div>
                <div className="task-group-content">
                  {today.length > 0 ? (
                    today.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <Empty
                      description="暂无今日任务"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              </div>
            </Col>

            {/* Upcoming Tasks */}
            <Col span={8}>
              <div className="task-group">
                <div className="task-group-header upcoming">
                  <Title level={4}>
                    即将到来
                    <Text style={{ marginLeft: 8 }}>({upcoming.length})</Text>
                  </Title>
                  <Text type="secondary">未来任务</Text>
                </div>
                <div className="task-group-content">
                  {upcoming.length > 0 ? (
                    upcoming.map((task) => <TaskCard key={task.id} task={task} />)
                  ) : (
                    <Empty
                      description="暂无即将到来的任务"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Spin>
      </Content>
    </Layout>
  )
}
