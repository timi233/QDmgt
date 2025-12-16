import React, { useState, useEffect } from 'react'
import { Table, Button, Card, message, Tag, Progress, Space, Select, Statistic, Row, Col } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'

const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const TargetList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState([])
  const [statistics, setStatistics] = useState<any>(null)
  const [filters, setFilters] = useState<{
    year?: number
    quarter?: string
    targetType?: string
  }>({})

  const fetchTargets = async (currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/targets`, {
        params: currentFilters,
      })
      setTargets(response.data.targets)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取目标列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/targets/statistics`, {
        params: { year: filters.year, quarter: filters.quarter },
      })
      setStatistics(response.data)
    } catch (error: any) {
      console.error('Fetch statistics error:', error)
    }
  }

  useEffect(() => {
    fetchTargets()
    fetchStatistics()
  }, [])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchTargets(newFilters)
    if (key === 'year' || key === 'quarter') {
      fetchStatistics()
    }
  }

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      yearly: '年度',
      quarterly: '季度',
      monthly: '月度',
    }
    return labels[type] || type
  }

  const columns = [
    {
      title: '目标类型',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'yearly' ? 'red' : type === 'quarterly' ? 'blue' : 'green'}>
          {getTargetTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: '年度',
      dataIndex: 'year',
      key: 'year',
      width: 100,
    },
    {
      title: '季度/月份',
      key: 'period',
      width: 120,
      render: (_: any, record: any) => {
        if (record.quarter) return record.quarter
        if (record.month) return `${record.month}月`
        return '-'
      },
    },
    {
      title: '新签目标',
      dataIndex: 'newSignTarget',
      key: 'newSignTarget',
      width: 120,
      align: 'right' as const,
      render: (value: number) => `${value.toFixed(0)}万`,
    },
    {
      title: '新签完成',
      dataIndex: 'newSignCompleted',
      key: 'newSignCompleted',
      width: 120,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const rate = record.newSignTarget > 0 ? (value / record.newSignTarget * 100).toFixed(1) : '0'
        return (
          <div>
            <div>{value.toFixed(0)}万</div>
            <Progress
              percent={parseFloat(rate)}
              size="small"
              status={parseFloat(rate) >= 100 ? 'success' : parseFloat(rate) >= 80 ? 'active' : 'exception'}
              showInfo={false}
            />
          </div>
        )
      },
    },
    {
      title: '核心业绩目标',
      dataIndex: 'coreRevenue',
      key: 'coreRevenue',
      width: 130,
      align: 'right' as const,
      render: (value: number) => `${value.toFixed(0)}万`,
    },
    {
      title: '核心业绩完成',
      dataIndex: 'coreRevCompleted',
      key: 'coreRevCompleted',
      width: 130,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const rate = record.coreRevenue > 0 ? (value / record.coreRevenue * 100).toFixed(1) : '0'
        return (
          <div>
            <div>{value.toFixed(0)}万</div>
            <Progress
              percent={parseFloat(rate)}
              size="small"
              status={parseFloat(rate) >= 100 ? 'success' : parseFloat(rate) >= 80 ? 'active' : 'exception'}
              showInfo={false}
            />
          </div>
        )
      },
    },
    {
      title: '高价值业绩目标',
      dataIndex: 'highValueRevenue',
      key: 'highValueRevenue',
      width: 140,
      align: 'right' as const,
      render: (value: number) => `${value.toFixed(0)}万`,
    },
    {
      title: '高价值业绩完成',
      dataIndex: 'highValueRevComp',
      key: 'highValueRevComp',
      width: 140,
      align: 'right' as const,
      render: (value: number, record: any) => {
        const rate = record.highValueRevenue > 0 ? (value / record.highValueRevenue * 100).toFixed(1) : '0'
        return (
          <div>
            <div>{value.toFixed(0)}万</div>
            <Progress
              percent={parseFloat(rate)}
              size="small"
              status={parseFloat(rate) >= 100 ? 'success' : parseFloat(rate) >= 80 ? 'active' : 'exception'}
              showInfo={false}
            />
          </div>
        )
      },
    },
    {
      title: '负责人',
      dataIndex: ['user', 'name'],
      key: 'user',
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/targets/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/targets/${record.id}/edit`)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="新签完成率"
                value={statistics.newSignCompletionRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: statistics.newSignCompletionRate >= 80 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="核心业绩完成率"
                value={statistics.coreRevenueCompletionRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: statistics.coreRevenueCompletionRate >= 80 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高价值完成率"
                value={statistics.highValueCompletionRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: statistics.highValueCompletionRate >= 80 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="目标总数"
                value={statistics.totalTargets}
                suffix="个"
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card title="目标管理">
        <div style={{ marginBottom: 16 }}>
          <Space size="middle" wrap>
            <Select
              placeholder="按年度筛选"
              onChange={(value) => handleFilterChange('year', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有年度</Option>
              <Option value={2024}>2024年</Option>
              <Option value={2025}>2025年</Option>
              <Option value={2026}>2026年</Option>
            </Select>
            <Select
              placeholder="按季度筛选"
              onChange={(value) => handleFilterChange('quarter', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有季度</Option>
              <Option value="Q1">Q1</Option>
              <Option value="Q2">Q2</Option>
              <Option value="Q3">Q3</Option>
              <Option value="Q4">Q4</Option>
            </Select>
            <Select
              placeholder="按类型筛选"
              onChange={(value) => handleFilterChange('targetType', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有类型</Option>
              <Option value="yearly">年度</Option>
              <Option value="quarterly">季度</Option>
              <Option value="monthly">月度</Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/targets/create')}
            >
              新建目标
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={targets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default TargetList
