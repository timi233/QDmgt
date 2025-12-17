import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Space,
  Typography,
  Progress,
  Tag,
  message,
  Spin,
  Empty,
  Divider,
} from 'antd'
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  WarningOutlined,
  UserOutlined,
} from '@ant-design/icons'
import axios from '@/utils/axios'
import { formatRegion } from '@/utils/regionUtils'
import { Pie, Column } from '@ant-design/charts'

const { Title } = Typography
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface KPIData {
  totalDistributors: number
  newDistributors: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  conversionRate: number
  regionDistribution: { region: string; count: number; percentage: number }[]
  levelDistribution: { level: string; count: number; percentage: number }[]
  taskStatusDistribution: { status: string; count: number; percentage: number }[]
}

interface DistributorItem {
  id: string
  name: string
  region: string
  contactPerson: string
  phone: string
  cooperationLevel: string
  creditLimit: number
  ownerName: string
  taskCount: number
  completedTaskCount: number
  createdAt: string
}

interface SalesRanking {
  salesId: string
  salesName: string
  distributorCount: number
  taskCompletedCount: number
  conversionRate: number
}

interface EnhancedDashboardData {
  healthOverview: {
    healthy: number
    warning: number
    atRisk: number
    dormant: number
    avgHealthScore: number
  }
  tierDistribution: { tier: string; count: number; percentage: number }[]
  typeDistribution: { type: string; count: number; percentage: number }[]
  totalPartners: number
}

interface ContributionData {
  total: { partners: number; revenue: number }
  top20: { partners: number; revenue: number; percentage: number }
  top50: { partners: number; revenue: number; percentage: number }
}

interface GrowthData {
  newPartners: number
  upgradedPartners: number
  churnedPartners: number
  churnRate: number
  growthRate: number
  totalPartners: number
}

interface VisitStats {
  totalVisits: number
  visitsByType: { type: string; count: number }[]
  avgSatisfaction: number
  satisfactionResponses: number
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [distributors, setDistributors] = useState<DistributorItem[]>([])
  const [rankings, setRankings] = useState<SalesRanking[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [filters, setFilters] = useState({
    region: undefined as string | undefined,
    cooperationLevel: undefined as string | undefined,
    ownerId: undefined as string | undefined,
  })
  const [enhancedData, setEnhancedData] = useState<EnhancedDashboardData | null>(null)
  const [contributionData, setContributionData] = useState<ContributionData | null>(null)
  const [growthData, setGrowthData] = useState<GrowthData | null>(null)
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null)

  const getAuthHeaders = () => {
    return {
    }
  }

  const fetchKPIs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/kpis`, {
        headers: getAuthHeaders(),
        params: filters,
      })
      if (response.data.success) {
        setKpiData(response.data.data)
      }
    } catch (error) {
      console.error('Fetch KPIs error:', error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          message.error('访问被拒绝。数据看板仅对主管开放。')
        } else {
          message.error(error.response?.data?.error || '获取关键指标数据失败')
        }
      } else {
        message.error('获取关键指标数据失败')
      }
    }
  }

  const fetchDistributors = async (page = 1, limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/distributors`, {
        headers: getAuthHeaders(),
        params: {
          page,
          limit,
          ...filters,
        },
      })
      if (response.data.success) {
        setDistributors(response.data.distributors)
        setPagination({
          current: response.data.page,
          pageSize: response.data.limit,
          total: response.data.total,
        })
      }
    } catch (error) {
      console.error('Fetch distributors error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '获取分销商数据失败')
      } else {
        message.error('获取分销商数据失败')
      }
    }
  }

  const fetchRankings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/rankings`, {
        headers: getAuthHeaders(),
        params: { limit: 5 },
      })
      if (response.data.success) {
        setRankings(response.data.data)
      }
    } catch (error) {
      console.error('Fetch rankings error:', error)
    }
  }

  const fetchEnhancedDashboard = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/enhanced`, {
        headers: getAuthHeaders(),
      })
      if (response.data.success) {
        setEnhancedData(response.data.data)
      }
    } catch (error) {
      console.error('Fetch enhanced dashboard error:', error)
    }
  }

  const fetchContributionData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/contribution`, {
        headers: getAuthHeaders(),
      })
      if (response.data.success) {
        setContributionData(response.data.data)
      }
    } catch (error) {
      console.error('Fetch contribution data error:', error)
    }
  }

  const fetchGrowthData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/growth`, {
        headers: getAuthHeaders(),
      })
      if (response.data.success) {
        setGrowthData(response.data.data)
      }
    } catch (error) {
      console.error('Fetch growth data error:', error)
    }
  }

  const fetchVisitStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/visits-stats`, {
        headers: getAuthHeaders(),
      })
      if (response.data.success) {
        setVisitStats(response.data.data)
      }
    } catch (error) {
      console.error('Fetch visit stats error:', error)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchKPIs(),
        fetchDistributors(),
        fetchRankings(),
        fetchEnhancedDashboard(),
        fetchContributionData(),
        fetchGrowthData(),
        fetchVisitStats(),
      ])
    } catch (error) {
      console.error('Load dashboard data error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    fetchKPIs()
    fetchDistributors(1, pagination.pageSize)
  }, [filters])

  const handleTableChange = (newPagination: any) => {
    fetchDistributors(newPagination.current, newPagination.pageSize)
  }

  const handleRegionChange = (value: string) => {
    setFilters(prev => ({ ...prev, region: value || undefined }))
  }

  const handleLevelChange = (value: string) => {
    setFilters(prev => ({ ...prev, cooperationLevel: value || undefined }))
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      in_progress: 'blue',
      completed: 'green',
      overdue: 'red',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      overdue: '逾期',
    }
    return labels[status] || status
  }

  const distributorColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 120,
      render: (region: string) => formatRegion(region),
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 100,
    },
    {
      title: '合作等级',
      dataIndex: 'cooperationLevel',
      key: 'cooperationLevel',
      width: 100,
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{getLevelLabel(level)}</Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'ownerName',
      key: 'ownerName',
      width: 100,
    },
    {
      title: '任务进度',
      key: 'tasks',
      width: 120,
      render: (_: any, record: DistributorItem) => (
        <span>
          {record.completedTaskCount}/{record.taskCount}
          {record.taskCount > 0 && (
            <Progress
              percent={Math.round((record.completedTaskCount / record.taskCount) * 100)}
              size="small"
              style={{ marginLeft: 8, width: 60 }}
            />
          )}
        </span>
      ),
    },
    {
      title: '授信额度',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      width: 100,
      render: (value: number) => `${value}万`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ]

  const channelTierLabels: Record<string, string> = {
    strategic: '战略伙伴',
    core: '核心伙伴',
    standard: '标准伙伴',
    developing: '培育伙伴',
  }

  const partnerTypeLabels: Record<string, string> = {
    ISV: 'ISV',
    SI: '系统集成商',
    VAR: '增值代理',
    agent: '代理商',
    reseller: '经销商',
  }

  const visitTypeLabels: Record<string, string> = {
    onsite: '现场拜访',
    online: '线上会议',
    phone: '电话沟通',
    meeting: '商务会议',
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <p>仪表盘加载中...</p>
      </div>
    )
  }

  if (!kpiData) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="暂无数据" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>主管仪表盘</Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="经销商总数"
              value={kpiData.totalDistributors}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#52c41a' }}>
                +{kpiData.newDistributors} 新增（30天）
              </span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={kpiData.totalTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#faad14' }}>
                {kpiData.pendingTasks} 条待处理
              </span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成任务"
              value={kpiData.completedTasks}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#f5222d' }}>
                {kpiData.overdueTasks} 条逾期
              </span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="转化率"
              value={kpiData.conversionRate}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: kpiData.conversionRate >= 50 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Health Overview */}
      {enhancedData && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card title="伙伴健康总览">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="健康伙伴" value={enhancedData.healthOverview.healthy} valueStyle={{ color: '#52c41a' }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="预警伙伴" value={enhancedData.healthOverview.warning} valueStyle={{ color: '#fa8c16' }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="风险伙伴" value={enhancedData.healthOverview.atRisk} valueStyle={{ color: '#f5222d' }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="沉睡伙伴" value={enhancedData.healthOverview.dormant} />
                  </Col>
                </Row>
                <Divider />
                <Statistic
                  title="平均健康分"
                  value={Math.round(enhancedData.healthOverview.avgHealthScore)}
                  suffix="/ 100"
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="渠道分层分布">
                {enhancedData.tierDistribution.length === 0 ? (
                  <Empty description="暂无数据" />
                ) : (
                  <Pie
                    height={240}
                    data={enhancedData.tierDistribution.map(item => ({
                      type: channelTierLabels[item.tier] || item.tier,
                      value: item.count,
                    }))}
                    angleField="value"
                    colorField="type"
                    radius={1}
                    innerRadius={0.6}
                    label={{
                      text: 'value',
                      position: 'outside',
                    }}
                    interaction={{ elementHighlight: true }}
                    legend={{ color: { position: 'bottom' } }}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="渠道类型分布">
                {enhancedData.typeDistribution.length === 0 ? (
                  <Empty description="暂无数据" />
                ) : (
                  <Column
                    height={240}
                    data={enhancedData.typeDistribution.map(item => ({
                      type: partnerTypeLabels[item.type] || item.type,
                      value: item.count,
                    }))}
                    xField="type"
                    yField="value"
                    columnWidthRatio={0.6}
                    label={{
                      text: 'value',
                      position: 'inside',
                      style: { fill: '#fff' },
                    }}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Distribution Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="区域分布" size="small">
            {kpiData.regionDistribution.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              kpiData.regionDistribution.slice(0, 5).map(item => (
                <div key={item.region} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatRegion(item.region)}</span>
                    <span>{item.count} ({item.percentage}%)</span>
                  </div>
                  <Progress percent={item.percentage} showInfo={false} size="small" />
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="合作等级分布" size="small">
            {kpiData.levelDistribution.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              kpiData.levelDistribution.map(item => (
                <div key={item.level} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Tag color={getLevelColor(item.level)}>{getLevelLabel(item.level)}</Tag>
                    <span>{item.count} ({item.percentage}%)</span>
                  </div>
                  <Progress
                    percent={item.percentage}
                    showInfo={false}
                    size="small"
                    strokeColor={
                      item.level === 'platinum' ? '#722ed1' :
                      item.level === 'gold' ? '#faad14' :
                      item.level === 'silver' ? '#1890ff' : '#d9d9d9'
                    }
                  />
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="任务状态分布" size="small">
            {kpiData.taskStatusDistribution.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              kpiData.taskStatusDistribution.map(item => (
                <div key={item.status} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Tag color={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Tag>
                    <span>{item.count} ({item.percentage}%)</span>
                  </div>
                  <Progress
                    percent={item.percentage}
                    showInfo={false}
                    size="small"
                    status={item.status === 'overdue' ? 'exception' : undefined}
                  />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Contribution & Growth & Visits */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="贡献度分析">
            {contributionData ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="Top 20% 贡献度"
                  value={contributionData.top20.percentage}
                  suffix="%"
                  valueStyle={{ color: '#722ed1' }}
                />
                <Progress
                  percent={contributionData.top20.percentage}
                  status={contributionData.top20.percentage >= 80 ? 'success' : 'active'}
                />
                <div style={{ color: '#999' }}>
                  前 20% 伙伴数量：{contributionData.top20.partners}/{contributionData.total.partners}
                </div>
                <Divider />
                <Statistic title="Top 50% 覆盖" value={contributionData.top50.percentage} suffix="%" />
              </Space>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="成长性分析">
            {growthData ? (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="新增伙伴(30天)" value={growthData.newPartners} />
                </Col>
                <Col span={12}>
                  <Statistic title="流失伙伴" value={growthData.churnedPartners} valueStyle={{ color: '#f5222d' }} />
                </Col>
                <Col span={12}>
                  <Statistic title="成长率" value={growthData.growthRate} suffix="%" />
                </Col>
                <Col span={12}>
                  <Statistic title="流失率" value={growthData.churnRate} suffix="%" />
                </Col>
              </Row>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="拜访统计">
            {visitStats ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic title="近30天拜访次数" value={visitStats.totalVisits} />
                <Statistic
                  title="平均满意度"
                  value={visitStats.avgSatisfaction}
                  suffix={`/ 5 (${visitStats.satisfactionResponses} 份反馈)`}
                />
                {visitStats.visitsByType.map(item => (
                  <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span>{visitTypeLabels[item.type] || item.type}</span>
                    <span>{item.count} 次</span>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Sales Rankings */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="销售业绩排行榜" size="small">
            {rankings.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              rankings.map((item, index) => (
                <div
                  key={item.salesId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < rankings.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <Space>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 24,
                        height: 24,
                        lineHeight: '24px',
                        textAlign: 'center',
                        borderRadius: '50%',
                        background: index < 3 ? '#1890ff' : '#f0f0f0',
                        color: index < 3 ? '#fff' : '#666',
                        fontSize: 12,
                      }}
                    >
                      {index + 1}
                    </span>
                    <UserOutlined />
                    <span>{item.salesName}</span>
                  </Space>
                  <Space>
                    <span>{item.distributorCount} 家经销商</span>
                    <Tag color="green">{item.taskCompletedCount} 个任务</Tag>
                    <span>{item.conversionRate}%</span>
                  </Space>
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="快捷统计" size="small">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="人均任务数"
                  value={
                    kpiData.totalDistributors > 0
                      ? (kpiData.totalTasks / kpiData.totalDistributors).toFixed(1)
                      : 0
                  }
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="逾期率"
                  value={
                    kpiData.totalTasks > 0
                      ? ((kpiData.overdueTasks / kpiData.totalTasks) * 100).toFixed(1)
                      : 0
                  }
                  suffix="%"
                  valueStyle={{
                    fontSize: 20,
                    color: kpiData.overdueTasks > 0 ? '#f5222d' : '#52c41a',
                  }}
                  prefix={kpiData.overdueTasks > 0 ? <WarningOutlined /> : null}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Distributors Table */}
      <Card
        title="经销商概览"
        extra={
          <Space>
            <Select
              placeholder="按区域筛选"
              onChange={handleRegionChange}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">全部区域</Option>
              <Option value="Beijing">北京</Option>
              <Option value="Shanghai">上海</Option>
              <Option value="Guangzhou">广州</Option>
              <Option value="Shenzhen">深圳</Option>
            </Select>
            <Select
              placeholder="按等级筛选"
              onChange={handleLevelChange}
              style={{ width: 120 }}
              allowClear
            >
              <Option value="">全部等级</Option>
              <Option value="bronze">青铜</Option>
              <Option value="silver">白银</Option>
              <Option value="gold">黄金</Option>
              <Option value="platinum">铂金</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={distributorColumns}
          dataSource={distributors}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
          size="small"
        />
      </Card>
    </div>
  )
}

export default Dashboard
