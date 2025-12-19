import React, { useState, useEffect } from 'react'
import { Table, Button, Input, Select, Space, Tag, message, Card } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'
import { formatRegion } from '@/utils/regionUtils'

const { Search } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Distributor {
  id: string
  name: string
  channelTier: string
  partnerType: string
  region: string
  contactPerson: string
  cooperationLevel: string
  quarterlyTarget?: number
  quarterlyCompleted?: number
  projectCount?: number
  projectAmount?: number
  createdAt: string
  healthScore?: number
  healthStatus?: string
}

const DistributorList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<{
    region: string | undefined
    cooperationLevel: string | undefined
    channelTier: string | undefined
    partnerType: string | undefined
    healthStatus: string | undefined
    search: string | undefined
  }>({
    region: undefined,
    cooperationLevel: undefined,
    channelTier: undefined,
    partnerType: undefined,
    healthStatus: undefined,
    search: undefined,
  })

  const fetchDistributors = async (page = 1, limit = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/distributors`, {
        params: {
          page,
          limit,
          ...currentFilters,
        },
      })

      setDistributors(response.data.distributors)
      setPagination({
        current: response.data.pagination.page,
        pageSize: response.data.pagination.limit,
        total: response.data.pagination.total,
      })
    } catch (error: any) {
      console.error('Fetch distributors error:', error)
      message.error(error.response?.data?.error || '获取分销商列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDistributors()
  }, [])

  const handleTableChange = (newPagination: any) => {
    fetchDistributors(newPagination.current, newPagination.pageSize)
  }

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, search: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
  }

  const handleRegionChange = (value: string) => {
    const newFilters = { ...filters, region: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
  }

  const handleLevelChange = (value: string) => {
    const newFilters = { ...filters, cooperationLevel: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
  }

  const handleChannelTierChange = (value: string) => {
    const newFilters = { ...filters, channelTier: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
  }

  const handlePartnerTypeChange = (value: string) => {
    const newFilters = { ...filters, partnerType: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
  }

  const handleHealthStatusChange = (value: string) => {
    const newFilters = { ...filters, healthStatus: value || undefined }
    setFilters(newFilters)
    fetchDistributors(1, pagination.pageSize, newFilters)
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
      bronze: '铜牌',
      silver: '银牌',
      gold: '金牌',
      platinum: '白金',
    }
    return labels[level] || level
  }

  const getChannelTierMeta = (tier: string) => {
    const meta: Record<string, { label: string; color: string }> = {
      strategic: { label: '战略伙伴', color: 'magenta' },
      core: { label: '核心伙伴', color: 'geekblue' },
      standard: { label: '标准伙伴', color: 'default' },
      developing: { label: '培育伙伴', color: 'cyan' },
    }
    return meta[tier] || { label: tier || '-', color: 'default' }
  }

  const getPartnerTypeMeta = (type: string) => {
    const meta: Record<string, { label: string; color: string }> = {
      ISV: { label: 'ISV', color: 'purple' },
      SI: { label: '系统集成商', color: 'blue' },
      VAR: { label: '增值代理', color: 'green' },
      agent: { label: '代理商', color: 'orange' },
      reseller: { label: '经销商', color: 'cyan' },
    }
    return meta[type] || { label: type || '-', color: 'default' }
  }

  const getHealthStatusMeta = (status?: string) => {
    const meta: Record<string, { label: string; color: string }> = {
      healthy: { label: '健康', color: 'green' },
      warning: { label: '预警', color: 'orange' },
      at_risk: { label: '风险', color: 'red' },
      dormant: { label: '沉睡', color: 'default' },
    }
    if (!status) {
      return { label: '-', color: 'default' }
    }
    return meta[status] || { label: status, color: 'default' }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      width: 180,
      fixed: 'left' as const,
    },
    {
      title: '渠道分层',
      dataIndex: 'channelTier',
      key: 'channelTier',
      width: 140,
      render: (tier: string) => {
        const meta = getChannelTierMeta(tier)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '伙伴类型',
      dataIndex: 'partnerType',
      key: 'partnerType',
      width: 140,
      render: (type: string) => {
        const meta = getPartnerTypeMeta(type)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 180,
      render: (region: string) => formatRegion(region),
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 120,
    },
    {
      title: '合作等级',
      dataIndex: 'cooperationLevel',
      key: 'cooperationLevel',
      width: 120,
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>
          {getLevelLabel(level)}
        </Tag>
      ),
    },
    {
      title: '季度目标',
      dataIndex: 'quarterlyTarget',
      key: 'quarterlyTarget',
      width: 120,
      align: 'right' as const,
      render: (value: number) => value ? `${value.toFixed(0)}万` : '-',
    },
    {
      title: '目标完成率',
      key: 'targetCompletion',
      width: 140,
      render: (_: any, record: any) => {
        if (!record.quarterlyTarget) return '-'
        const rate = (record.quarterlyCompleted / record.quarterlyTarget * 100).toFixed(1)
        const rateNum = parseFloat(rate)
        let color = 'default'
        if (rateNum >= 100) color = 'success'
        else if (rateNum >= 80) color = 'processing'
        else if (rateNum >= 60) color = 'warning'
        else color = 'error'
        return <Tag color={color}>{rate}%</Tag>
      },
    },
    {
      title: '项目数/金额',
      key: 'projects',
      width: 140,
      render: (_: any, record: any) => (
        <div>
          <div>{record.projectCount || 0}个</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.projectAmount ? `${record.projectAmount.toFixed(0)}万` : '0万'}
          </div>
        </div>
      ),
    },
    {
      title: '健康度',
      dataIndex: 'healthScore',
      key: 'healthScore',
      width: 100,
      render: (value: number | undefined) => {
        const hasValue = typeof value === 'number'
        return (
          <Tag color={!hasValue ? 'default' : value >= 80 ? 'green' : value >= 60 ? 'blue' : 'orange'}>
            {hasValue ? `${Math.round(value)}` : '-'}
          </Tag>
        )
      },
    },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      width: 120,
      render: (status: string) => {
        const meta = getHealthStatusMeta(status)
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as const,
      width: 80,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/distributors/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card title="分销商管理">
        <div style={{ marginBottom: 16 }}>
          <Space size="middle" wrap>
            <Search
              placeholder="搜索名称或联系人"
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="按区域筛选"
              onChange={handleRegionChange}
              style={{ width: 200 }}
              allowClear
            >
              <Option value="">所有区域</Option>
              <Option value="北京">北京</Option>
              <Option value="上海">上海</Option>
              <Option value="广州">广州</Option>
              <Option value="深圳">深圳</Option>
            </Select>
            <Select
              placeholder="按等级筛选"
              onChange={handleLevelChange}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有等级</Option>
              <Option value="bronze">铜牌</Option>
              <Option value="silver">银牌</Option>
              <Option value="gold">金牌</Option>
              <Option value="platinum">白金</Option>
            </Select>
            <Select
              placeholder="按渠道类型筛选"
              onChange={handlePartnerTypeChange}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="">所有伙伴类型</Option>
              <Option value="ISV">ISV</Option>
              <Option value="SI">系统集成商</Option>
              <Option value="VAR">增值代理</Option>
              <Option value="agent">代理商</Option>
              <Option value="reseller">经销商</Option>
            </Select>
            <Select
              placeholder="按渠道分层筛选"
              onChange={handleChannelTierChange}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="">所有分层</Option>
              <Option value="strategic">战略伙伴</Option>
              <Option value="core">核心伙伴</Option>
              <Option value="standard">标准伙伴</Option>
              <Option value="developing">培育伙伴</Option>
            </Select>
            <Select
              placeholder="按健康状态筛选"
              onChange={handleHealthStatusChange}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="">全部状态</Option>
              <Option value="healthy">健康</Option>
              <Option value="warning">预警</Option>
              <Option value="at_risk">风险</Option>
              <Option value="dormant">沉睡</Option>
            </Select>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/distributors/create')}
            >
              新建分销商
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={distributors}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 2000 }}
        />
      </Card>
    </div>
  )
}

export default DistributorList
