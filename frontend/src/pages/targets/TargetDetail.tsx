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
  Progress,
  Row,
  Col,
  Statistic
} from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'

const { Title } = Typography

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface ChannelTarget {
  id: string
  year: number
  quarter: string
  targetType: string
  newSignTarget: number
  coreOpportunity: number
  coreRevenue: number
  highValueOpp: number
  highValueRevenue: number
  newSignCompleted: number
  coreOppCompleted: number
  coreRevCompleted: number
  highValueOppComp: number
  highValueRevComp: number
  description: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    username: string
    name: string
  }
}

const targetTypeLabels: Record<string, string> = {
  quarterly: '季度目标',
  yearly: '年度目标',
  monthly: '月度目标'
}

export function TargetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<ChannelTarget | null>(null)

  useEffect(() => {
    fetchTarget()
  }, [id])

  const fetchTarget = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/targets/${id}`)
      if (response.data.success) {
        setTarget(response.data.target)
      }
    } catch (error: any) {
      console.error('获取目标失败:', error)
      message.error(error.response?.data?.error || '获取目标失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!target) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <p>未找到目标</p>
          <Button onClick={() => navigate('/targets')}>返回列表</Button>
        </Card>
      </div>
    )
  }

  const calculateProgress = (completed: number, target: number) => {
    if (target === 0) return 0
    return Math.round((completed / target) * 100)
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/targets')}>
          返回
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/targets/${id}/edit`)}
        >
          编辑
        </Button>
      </Space>

      <Card style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3}>目标详情</Title>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="目标周期">
            {target.year}年 {target.quarter}
          </Descriptions.Item>
          <Descriptions.Item label="目标类型">
            <Tag color="blue">
              {targetTypeLabels[target.targetType] || target.targetType}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建人" span={2}>
            {target.user?.name || target.user?.username}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {target.description}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(target.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(target.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>目标完成情况</Title>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="新签约目标" size="small">
              <Statistic
                title="目标"
                value={target.newSignTarget}
                suffix="万"
              />
              <Statistic
                title="已完成"
                value={target.newSignCompleted}
                suffix="万"
                valueStyle={{ color: '#52c41a' }}
                style={{ marginTop: 16 }}
              />
              <Progress
                percent={calculateProgress(target.newSignCompleted, target.newSignTarget)}
                status={calculateProgress(target.newSignCompleted, target.newSignTarget) >= 100 ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="核心机会" size="small">
              <Statistic
                title="目标"
                value={target.coreOpportunity}
                suffix="万"
              />
              <Statistic
                title="已完成"
                value={target.coreOppCompleted}
                suffix="万"
                valueStyle={{ color: '#52c41a' }}
                style={{ marginTop: 16 }}
              />
              <Progress
                percent={calculateProgress(target.coreOppCompleted, target.coreOpportunity)}
                status={calculateProgress(target.coreOppCompleted, target.coreOpportunity) >= 100 ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="核心营收" size="small">
              <Statistic
                title="目标"
                value={target.coreRevenue}
                suffix="万"
              />
              <Statistic
                title="已完成"
                value={target.coreRevCompleted}
                suffix="万"
                valueStyle={{ color: '#52c41a' }}
                style={{ marginTop: 16 }}
              />
              <Progress
                percent={calculateProgress(target.coreRevCompleted, target.coreRevenue)}
                status={calculateProgress(target.coreRevCompleted, target.coreRevenue) >= 100 ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="高价值机会" size="small">
              <Statistic
                title="目标"
                value={target.highValueOpp}
                suffix="万"
              />
              <Statistic
                title="已完成"
                value={target.highValueOppComp}
                suffix="万"
                valueStyle={{ color: '#52c41a' }}
                style={{ marginTop: 16 }}
              />
              <Progress
                percent={calculateProgress(target.highValueOppComp, target.highValueOpp)}
                status={calculateProgress(target.highValueOppComp, target.highValueOpp) >= 100 ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="高价值营收" size="small">
              <Statistic
                title="目标"
                value={target.highValueRevenue}
                suffix="万"
              />
              <Statistic
                title="已完成"
                value={target.highValueRevComp}
                suffix="万"
                valueStyle={{ color: '#52c41a' }}
                style={{ marginTop: 16 }}
              />
              <Progress
                percent={calculateProgress(target.highValueRevComp, target.highValueRevenue)}
                status={calculateProgress(target.highValueRevComp, target.highValueRevenue) >= 100 ? 'success' : 'active'}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default TargetDetail
