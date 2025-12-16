import React, { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Select,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  List,
  Button,
  message,
  Spin,
  Empty,
  Space,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '@/utils/axios'
import dayjs from 'dayjs'
import { Line } from '@ant-design/charts'
import { useDistributorOptions } from '../../hooks/useDistributorOptions'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface HealthScore {
  overallScore: number
  healthStatus: 'healthy' | 'warning' | 'at_risk' | 'dormant'
  performanceScore: number
  revenueGrowth: number
  targetAchievement: number
  orderFrequency: number
  engagementScore: number
  productLinesCount: number
  trainingParticipation: number
  activityScore: number
  lastOrderDays: number
  lastContactDays: number
  responseRate: number
  satisfactionScore: number
  avgSatisfactionRating: number
  complaintCount: number
  alerts: string[]
  recommendations: string[]
  calculatedAt: string
}

interface HealthHistoryItem extends HealthScore {
  id: string
}

const statusMeta: Record<
  HealthScore['healthStatus'],
  {
    label: string
    color: string
  }
> = {
  healthy: { label: '健康', color: 'green' },
  warning: { label: '预警', color: 'orange' },
  at_risk: { label: '风险', color: 'volcano' },
  dormant: { label: '沉睡', color: 'default' },
}

const HealthScoreDetail: React.FC = () => {
  const { distributorId } = useParams<{ distributorId?: string }>()
  const navigate = useNavigate()
  const { options: distributorOptions, loading: distributorsLoading } = useDistributorOptions()
  const [selectedDistributor, setSelectedDistributor] = useState<string | undefined>(distributorId)
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [history, setHistory] = useState<HealthHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    if (distributorId) {
      setSelectedDistributor(distributorId)
    } else {
      setSelectedDistributor(undefined)
      setHealthScore(null)
      setHistory([])
    }
  }, [distributorId])

  const getAuthHeaders = () => {
    return { }
  }

  const fetchHealthData = async (id: string) => {
    setLoading(true)
    try {
      const [latestRes, historyRes] = await Promise.all([
        axios.get<{ distributorId: string; healthScore: HealthScore | null }>(
          `${API_BASE_URL}/health-scores/${id}/latest`,
          { headers: getAuthHeaders() }
        ),
        axios.get<{ distributorId: string; history: HealthHistoryItem[] }>(
          `${API_BASE_URL}/health-scores/${id}/history`,
          {
            headers: getAuthHeaders(),
            params: { limit: 12 },
          }
        ),
      ])

      if (!latestRes.data.healthScore) {
        message.info('该分销商暂未生成健康度评分，请先计算')
        setHealthScore(null)
      } else {
        setHealthScore(latestRes.data.healthScore)
      }
      setHistory(historyRes.data.history || [])
    } catch (error) {
      console.error('Fetch health score error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '获取健康度信息失败')
      } else {
        message.error('获取健康度信息失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDistributor) {
      fetchHealthData(selectedDistributor)
    }
  }, [selectedDistributor])

  const handleDistributorChange = (value?: string) => {
    setSelectedDistributor(value || undefined)
    if (value) {
      navigate(`/health-scores/${value}`)
    } else {
      navigate('/health-scores')
    }
  }

  const handleRecalculate = async () => {
    if (!selectedDistributor) return
    setRecalculating(true)
    try {
      await axios.post(
        `${API_BASE_URL}/health-scores/calculate/${selectedDistributor}`,
        { headers: getAuthHeaders() }
      )
      message.success('健康度已重新计算')
      fetchHealthData(selectedDistributor)
    } catch (error) {
      console.error('Recalculate error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '重新计算健康度失败')
      } else {
        message.error('重新计算健康度失败')
      }
    } finally {
      setRecalculating(false)
    }
  }

  const historyData = useMemo(
    () =>
      history.map(item => ({
        date: dayjs(item.calculatedAt).format('YYYY-MM-DD'),
        score: Math.round(item.overallScore),
      })),
    [history]
  )

  const dimensionData = [
    {
      key: 'performanceScore',
      title: '业绩表现',
      value: healthScore?.performanceScore || 0,
      description: `目标达成率 ${healthScore?.targetAchievement?.toFixed?.(0) || 0}%`,
    },
    {
      key: 'engagementScore',
      title: '合作深度',
      value: healthScore?.engagementScore || 0,
      description: `产品线 ${healthScore?.productLinesCount || 0} / 培训参与 ${healthScore?.trainingParticipation || 0}%`,
    },
    {
      key: 'activityScore',
      title: '活跃度',
      value: healthScore?.activityScore || 0,
      description: `距离上次联系 ${healthScore?.lastContactDays || 0} 天`,
    },
    {
      key: 'satisfactionScore',
      title: '满意度',
      value: healthScore?.satisfactionScore || 0,
      description: `平均满意度 ${healthScore?.avgSatisfactionRating?.toFixed?.(1) || 0}`,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Select
              showSearch
              placeholder="选择分销商查看健康度"
              style={{ minWidth: 260 }}
              loading={distributorsLoading}
              optionFilterProp="label"
              options={distributorOptions}
              value={selectedDistributor}
              onChange={(value) => handleDistributorChange(value)}
              allowClear
            />
            {selectedDistributor && (
              <Button icon={<ReloadOutlined />} loading={recalculating} onClick={handleRecalculate}>
                重新计算健康度
              </Button>
            )}
          </Space>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : !selectedDistributor ? (
            <Empty description="请选择分销商以查看健康度信息" />
          ) : !healthScore ? (
            <Empty description="暂无健康度数据，请先进行计算" />
          ) : (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card>
                    <Statistic
                      title="健康度总分"
                      value={Math.round(healthScore.overallScore)}
                      suffix="/ 100"
                      valueStyle={{ fontSize: 36 }}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Tag color={statusMeta[healthScore.healthStatus]?.color}>
                        {statusMeta[healthScore.healthStatus]?.label}
                      </Tag>
                      <div style={{ color: '#999', marginTop: 8 }}>
                        计算时间：{dayjs(healthScore.calculatedAt).format('YYYY-MM-DD HH:mm')}
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={16}>
                  <Card title="健康度维度表现">
                    <Row gutter={[16, 16]}>
                      {dimensionData.map((item) => (
                        <Col xs={24} sm={12} key={item.key}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>{item.title}</span>
                              <strong>{Math.round(item.value)}/100</strong>
                            </div>
                            <Progress percent={Math.round(item.value)} showInfo={false} />
                            <div style={{ fontSize: 12, color: '#888' }}>{item.description}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="风险预警" bodyStyle={{ minHeight: 200 }}>
                    {healthScore.alerts?.length ? (
                      <List
                        dataSource={healthScore.alerts}
                        renderItem={(alert, index) => (
                          <List.Item key={`${alert}-${index}`}>
                            <Tag color="red" style={{ marginRight: 8 }}>
                              {index + 1}
                            </Tag>
                            <span>{alert}</span>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="暂无预警" />
                    )}
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="改进建议" bodyStyle={{ minHeight: 200 }}>
                    {healthScore.recommendations?.length ? (
                      <List
                        dataSource={healthScore.recommendations}
                        renderItem={(item, index) => (
                          <List.Item key={`${item}-${index}`}>
                            <Tag color="blue" style={{ marginRight: 8 }}>
                              建议 {index + 1}
                            </Tag>
                            <span>{item}</span>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="暂无建议" />
                    )}
                  </Card>
                </Col>
              </Row>

              <Card title="健康度趋势（近12次）">
                {historyData.length === 0 ? (
                  <Empty description="暂无历史数据" />
                ) : (
                  <Line
                    height={320}
                    data={historyData}
                    xField="date"
                    yField="score"
                    smooth
                    point={{ size: 4 }}
                    yAxis={{ min: 0, max: 100, label: { formatter: (v) => `${v}` } }}
                    tooltip={{ showMarkers: true }}
                  />
                )}
              </Card>
            </>
          )}
        </Space>
      </Card>
    </div>
  )
}

export default HealthScoreDetail
