import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Tag,
  Divider,
  List
} from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import { formatRegion } from '@/utils/regionUtils'

const { Title } = Typography

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface WorkPlan {
  id: string
  distributorId: string
  userId: string
  year: number
  month: number
  opportunitySource: string
  projectMgmt: string
  channelActions: string
  status: string
  createdAt: string
  updatedAt: string
  distributor?: {
    id: string
    name: string
    region: string
  }
  user?: {
    id: string
    username: string
    name: string
  }
  weeklyReviews?: Array<{
    id: string
    weekNumber: number
    progress: string
    obstacles: string
    adjustments: string
    createdAt: string
  }>
}

const statusLabels: Record<string, string> = {
  planning: '规划中',
  executing: '执行中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusColors: Record<string, string> = {
  planning: 'blue',
  executing: 'processing',
  completed: 'success',
  cancelled: 'default'
}

export function WorkPlanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [workPlan, setWorkPlan] = useState<WorkPlan | null>(null)

  useEffect(() => {
    fetchWorkPlan()
  }, [id])

  const fetchWorkPlan = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/work-plans/${id}`)
      if (response.data.success) {
        setWorkPlan(response.data.workPlan)
      }
    } catch (error: any) {
      console.error('获取工作计划失败:', error)
      message.error(error.response?.data?.error || '获取工作计划失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..."><div /></Spin>
      </div>
    )
  }

  if (!workPlan) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>未找到工作计划</p>
          <Button onClick={() => navigate('/work-plans')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/work-plans')}>
          返回
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/work-plans/${id}/edit`)}
        >
          编辑
        </Button>
      </Space>

      <Card style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3}>工作计划详情</Title>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="计划周期">
            {workPlan.year}年 {workPlan.month}月
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusColors[workPlan.status]}>
              {statusLabels[workPlan.status] || workPlan.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="经销商" span={2}>
            {workPlan.distributor?.name} ({formatRegion(workPlan.distributor?.region || '')})
          </Descriptions.Item>
          <Descriptions.Item label="负责人" span={2}>
            {workPlan.user?.name || workPlan.user?.username}
          </Descriptions.Item>
          <Descriptions.Item label="机会来源" span={2}>
            {workPlan.opportunitySource}
          </Descriptions.Item>
          <Descriptions.Item label="项目管理" span={2}>
            {workPlan.projectMgmt}
          </Descriptions.Item>
          <Descriptions.Item label="渠道动作" span={2}>
            {workPlan.channelActions}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(workPlan.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(workPlan.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {workPlan.weeklyReviews && workPlan.weeklyReviews.length > 0 && (
          <>
            <Divider>周度回顾</Divider>
            <List
              dataSource={workPlan.weeklyReviews}
              renderItem={review => (
                <List.Item>
                  <Card style={{ width: '100%' }} size="small">
                    <Title level={5}>第 {review.weekNumber} 周</Title>
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="进度情况">
                        {review.progress}
                      </Descriptions.Item>
                      <Descriptions.Item label="遇到障碍">
                        {review.obstacles}
                      </Descriptions.Item>
                      <Descriptions.Item label="调整措施">
                        {review.adjustments}
                      </Descriptions.Item>
                      <Descriptions.Item label="记录时间">
                        {new Date(review.createdAt).toLocaleString()}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </List.Item>
              )}
            />
          </>
        )}
      </Card>
    </div>
  )
}

export default WorkPlanDetail
