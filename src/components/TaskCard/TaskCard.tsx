import React from 'react'
import { Card, Tag, Typography, Space, Avatar, Tooltip } from 'antd'
import {
  ClockCircleOutlined,
  UserOutlined,
  CommentOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../types/task'
import './TaskCard.css'

const { Text, Paragraph } = Typography

interface TaskCardProps {
  task: Task
}

const priorityColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
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
  overdue: '逾期',
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/tasks/${task.id}`)
  }

  const isOverdue = task.status === 'overdue'
  const deadline = new Date(task.deadline)
  const now = new Date()
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  const getDeadlineColor = () => {
    if (isOverdue) return 'error'
    if (daysUntilDeadline <= 1) return 'error'
    if (daysUntilDeadline <= 3) return 'warning'
    return 'default'
  }

  return (
    <Card
      className={`task-card ${isOverdue ? 'task-card-overdue' : ''}`}
      hoverable
      onClick={handleClick}
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Title and Priority */}
        <div className="task-card-header">
          <Text strong className="task-card-title">
            {task.title}
          </Text>
          <Tag color={priorityColors[task.priority]}>
            {priorityLabels[task.priority]}
          </Tag>
        </div>

        {/* Description */}
        {task.description && (
          <Paragraph
            ellipsis={{ rows: 2 }}
            className="task-card-description"
            style={{ marginBottom: 0 }}
          >
            {task.description}
          </Paragraph>
        )}

        {/* Distributor */}
        {task.distributor && (
          <Text type="secondary" className="task-card-distributor">
            {task.distributor.name} - {task.distributor.region}
          </Text>
        )}

        {/* Footer */}
        <div className="task-card-footer">
          <Space size="small">
            {/* Status */}
            <Tag color={statusColors[task.status]}>
              {statusLabels[task.status]}
            </Tag>

            {/* Deadline */}
            <Tooltip
              title={`截止时间: ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}`}
            >
              <Tag icon={<ClockCircleOutlined />} color={getDeadlineColor()}>
                {daysUntilDeadline > 0
                  ? `${daysUntilDeadline}天`
                  : isOverdue
                  ? '已逾期'
                  : '今天'}
              </Tag>
            </Tooltip>

            {/* Assigned User */}
            {task.assignedUser && (
              <Tooltip title={`负责人: ${task.assignedUser.name || task.assignedUser.username}`}>
                <Avatar size="small" icon={<UserOutlined />}>
                  {(task.assignedUser.name || task.assignedUser.username).charAt(0)}
                </Avatar>
              </Tooltip>
            )}

            {/* Collaborators */}
            {task.collaborators && task.collaborators.length > 0 && (
              <Tooltip
                title={`协作人: ${task.collaborators.map((c) => c.user.name || c.user.username).join(', ')}`}
              >
                <Tag icon={<TeamOutlined />} color="blue">
                  {task.collaborators.length}
                </Tag>
              </Tooltip>
            )}

            {/* Comments */}
            {task._count && task._count.comments > 0 && (
              <Tag icon={<CommentOutlined />}>
                {task._count.comments}
              </Tag>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  )
}
