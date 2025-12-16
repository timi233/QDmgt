import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Table,
  message,
  Spin,
  Popconfirm,
} from 'antd'
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import axios, { deleteWithConfirm } from '@/utils/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const DistributorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [distributor, setDistributor] = useState<any>(null)

  const fetchDistributor = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors/${id}`)
      setDistributor(response.data.distributor)
    } catch (error: any) {
      console.error('Fetch distributor error:', error)
      message.error(error.response?.data?.error || '获取分销商信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDistributor()
  }, [id])

  const handleDelete = async () => {
    try {
      await deleteWithConfirm(`${API_BASE_URL}/distributors/${id}`)
      message.success('经销商删除成功')
      navigate('/distributors')
    } catch (error: any) {
      console.error('Delete error:', error)
      message.error(error.response?.data?.error || '删除经销商失败')
    }
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      bronze: 'default',
      silver: 'blue',
      gold: 'gold',
      platinum: 'purple',
    }
    return colors[level] || 'default'
  }

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      bronze: '青铜',
      silver: '白银',
      gold: '黄金',
      platinum: '铂金',
    }
    return labels[level] || level
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '已完成',
      in_progress: '进行中',
      pending: '待处理',
      overdue: '逾期',
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      urgent: '紧急',
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    }
    return labels[priority] || priority
  }

  const taskColumns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'in_progress' ? 'blue' : 'default'}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'default'}>
          {getPriorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '指派给',
      dataIndex: ['assignedUser', 'name'],
      key: 'assignedUser',
      render: (name: string, record: any) => name || record.assignedUser?.username,
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!distributor) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>未找到经销商</p>
          <Button onClick={() => navigate('/distributors')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/distributors')}
            >
              返回
            </Button>
            <span>经销商详情</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/distributors/${id}/edit`)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个分销商吗?"
              onConfirm={handleDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="名称">{distributor.name}</Descriptions.Item>
          <Descriptions.Item label="区域">{distributor.region}</Descriptions.Item>
          <Descriptions.Item label="联系人">{distributor.contactPerson}</Descriptions.Item>
          <Descriptions.Item label="电话">{distributor.phone}</Descriptions.Item>
          <Descriptions.Item label="合作等级">
            <Tag color={getLevelColor(distributor.cooperationLevel)}>
              {getLevelLabel(distributor.cooperationLevel)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="授信额度">
            {distributor.creditLimit?.toLocaleString()} 万元
          </Descriptions.Item>
          <Descriptions.Item label="标签" span={2}>
            {distributor.tags?.map((tag: string) => (
              <Tag key={tag}>{tag}</Tag>
            )) || '暂无标签'}
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {distributor.owner?.name || distributor.owner?.username}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(distributor.createdAt).toLocaleString()}
          </Descriptions.Item>
          {distributor.historicalPerformance && (
            <Descriptions.Item label="历史业绩" span={2}>
              {distributor.historicalPerformance}
            </Descriptions.Item>
          )}
          {distributor.notes && (
            <Descriptions.Item label="备注" span={2}>
              {distributor.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="关联任务" style={{ marginTop: 24 }}>
        <Table
          columns={taskColumns}
          dataSource={distributor.tasks || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无关联任务' }}
        />
      </Card>
    </div>
  )
}

export default DistributorDetail
