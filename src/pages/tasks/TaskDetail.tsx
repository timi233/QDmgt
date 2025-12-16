import React, { useEffect, useState } from 'react'
import {
  Layout,
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Timeline,
  Input,
  List,
  Avatar,
  Select,
  Modal,
  Form,
  message,
  Spin,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserAddOutlined,
  CommentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getTaskById,
  updateTaskStatus,
  assignTask,
  addCollaborator,
  removeCollaborator,
  addComment,
} from '../../services/taskService'
import type { Task, TaskComment } from '../../types/task'

const { Content } = Layout
const { TextArea } = Input
const { Option } = Select

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

export const TaskDetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<Task | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (id) {
      loadTask()
    }
  }, [id])

  const loadTask = async () => {
    try {
      setLoading(true)
      const data = await getTaskById(id!)
      setTask(data)
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to load task')
      navigate('/workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTaskStatus(id!, newStatus)
      message.success('Task status updated')
      loadTask()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update status')
    }
  }

  const handleAssignTask = async (values: any) => {
    try {
      await assignTask(id!, values.assignedUserId, values.reason)
      message.success('Task assigned successfully')
      setShowAssignModal(false)
      form.resetFields()
      loadTask()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to assign task')
    }
  }

  const handleAddCollaborator = async (values: any) => {
    try {
      await addCollaborator(id!, values.userId)
      message.success('Collaborator added')
      setShowCollaboratorModal(false)
      form.resetFields()
      loadTask()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to add collaborator')
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeCollaborator(id!, userId)
      message.success('Collaborator removed')
      loadTask()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to remove collaborator')
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      message.warning('Please enter a comment')
      return
    }

    try {
      setSubmittingComment(true)
      await addComment(id!, commentText)
      message.success('Comment added')
      setCommentText('')
      loadTask()
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading || !task) {
    return (
      <Layout style={{ minHeight: '100vh', padding: 24 }}>
        <Content style={{ textAlign: 'center', paddingTop: 100 }}>
          <Spin size="large" />
        </Content>
      </Layout>
    )
  }

  const deadline = new Date(task.deadline)

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <Space style={{ marginBottom: 24 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作台
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/tasks/${id}/edit`)}>
            编辑任务
          </Button>
        </Space>

        {/* Task Info */}
        <Card title={task.title} style={{ marginBottom: 24 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="状态">
              <Select
                value={task.status}
                onChange={handleStatusChange}
                style={{ width: 120 }}
              >
                <Option value="pending">待处理</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
              </Select>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'orange' : 'default'}>
                {priorityLabels[task.priority]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="截止时间">
              <Space>
                <ClockCircleOutlined />
                {deadline.toLocaleDateString()} {deadline.toLocaleTimeString()}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(task.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label="分销商" span={2}>
              {task.distributor?.name} - {task.distributor?.region}
            </Descriptions.Item>
            <Descriptions.Item label="负责人">
              <Space>
                {task.assignedUser?.name || task.assignedUser?.username}
                <Button
                  size="small"
                  onClick={() => setShowAssignModal(true)}
                >
                  转接
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="创建人">
              {task.creator?.name || task.creator?.username}
            </Descriptions.Item>
            {task.description && (
              <Descriptions.Item label="描述" span={2}>
                {task.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Collaborators */}
        <Card
          title="协作人"
          extra={
            <Button
              icon={<UserAddOutlined />}
              size="small"
              onClick={() => setShowCollaboratorModal(true)}
            >
              添加协作人
            </Button>
          }
          style={{ marginBottom: 24 }}
        >
          {task.collaborators && task.collaborators.length > 0 ? (
            <List
              dataSource={task.collaborators}
              renderItem={(collab) => (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      danger
                      onClick={() => handleRemoveCollaborator(collab.userId)}
                    >
                      移除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar>{(collab.user.name || collab.user.username).charAt(0)}</Avatar>}
                    title={collab.user.name || collab.user.username}
                    description={`添加于 ${new Date(collab.addedAt).toLocaleDateString()}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
              暂无协作人
            </div>
          )}
        </Card>

        {/* Comments */}
        <Card
          title={
            <Space>
              <CommentOutlined />
              评论讨论
            </Space>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <TextArea
              rows={3}
              placeholder="添加评论..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              showCount
            />
            <Button
              type="primary"
              onClick={handleAddComment}
              loading={submittingComment}
              style={{ marginTop: 8 }}
            >
              发表评论
            </Button>
          </div>

          {task.comments && task.comments.length > 0 ? (
            <List
              dataSource={task.comments}
              renderItem={(comment: TaskComment) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar>
                        {(comment.user.name || comment.user.username).charAt(0)}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <span>{comment.user.name || comment.user.username}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </Space>
                    }
                    description={comment.content}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
              暂无评论
            </div>
          )}
        </Card>

        {/* Status History */}
        {task.statusHistory && task.statusHistory.length > 0 && (
          <Card title="状态历史" style={{ marginTop: 24 }}>
            <Timeline>
              {task.statusHistory.map((history) => (
                <Timeline.Item key={history.id}>
                  <Space direction="vertical" size={0}>
                    <Text strong>
                      {history.fromStatus
                        ? `${statusLabels[history.fromStatus]} → ${statusLabels[history.toStatus]}`
                        : statusLabels[history.toStatus]}
                    </Text>
                    <Text type="secondary">
                      {history.changedByUser.name || history.changedByUser.username} •{' '}
                      {new Date(history.changedAt).toLocaleString()}
                    </Text>
                    {history.reason && <Text type="secondary">{history.reason}</Text>}
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}

        {/* Assign Task Modal */}
        <Modal
          title="转接任务"
          open={showAssignModal}
          onCancel={() => setShowAssignModal(false)}
          footer={null}
        >
          <Form form={form} onFinish={handleAssignTask} layout="vertical">
            <Form.Item
              label="新负责人ID"
              name="assignedUserId"
              rules={[{ required: true, message: '请输入新负责人ID' }]}
            >
              <Input placeholder="输入用户ID" />
            </Form.Item>
            <Form.Item label="转接原因" name="reason">
              <TextArea rows={3} placeholder="可选" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  确认转接
                </Button>
                <Button onClick={() => setShowAssignModal(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Collaborator Modal */}
        <Modal
          title="添加协作人"
          open={showCollaboratorModal}
          onCancel={() => setShowCollaboratorModal(false)}
          footer={null}
        >
          <Form form={form} onFinish={handleAddCollaborator} layout="vertical">
            <Form.Item
              label="协作人ID"
              name="userId"
              rules={[{ required: true, message: '请输入协作人ID' }]}
            >
              <Input placeholder="输入用户ID" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  添加
                </Button>
                <Button onClick={() => setShowCollaboratorModal(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  )
}

const { Text } = Typography
