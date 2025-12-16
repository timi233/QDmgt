import React, { useState, useEffect } from 'react'
import { Table, Button, Card, message, Tag, Space, Select } from 'antd'
import { EyeOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'

const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const WorkPlanList: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [workPlans, setWorkPlans] = useState([])
  const [filters, setFilters] = useState<{
    year?: number
    month?: number
    status?: string
  }>({})

  const fetchWorkPlans = async (currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/work-plans`, {
        params: currentFilters,
      })
      setWorkPlans(response.data.workPlans)
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取工作计划列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkPlans()
  }, [])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchWorkPlans(newFilters)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'default',
      executing: 'processing',
      completed: 'success',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: '计划中',
      executing: '执行中',
      completed: '已完成',
    }
    return labels[status] || status
  }

  const getChannelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      basic_plate: '基本盘',
      high_value: '高价值',
      normal_gold: '普通金牌',
      pending: '待签约',
      normal: '普通',
    }
    return labels[type] || type
  }

  const columns = [
    {
      title: '分销商',
      dataIndex: ['distributor', 'name'],
      key: 'distributor',
      width: 200,
      fixed: 'left' as const,
    },
    {
      title: '渠道类型',
      dataIndex: ['distributor', 'channelType'],
      key: 'channelType',
      width: 120,
      render: (type: string) => getChannelTypeLabel(type),
    },
    {
      title: '区域',
      dataIndex: ['distributor', 'region'],
      key: 'region',
      width: 180,
    },
    {
      title: '年月',
      key: 'period',
      width: 120,
      render: (_: any, record: any) => `${record.year}年${record.month}月`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '商机来源',
      dataIndex: 'opportunitySource',
      key: 'opportunitySource',
      width: 200,
      ellipsis: true,
    },
    {
      title: '项目管理',
      dataIndex: 'projectMgmt',
      key: 'projectMgmt',
      width: 200,
      ellipsis: true,
    },
    {
      title: '周报数',
      key: 'weeklyReviews',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => record.weeklyReviews?.length || 0,
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
            onClick={() => navigate(`/work-plans/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/work-plans/${record.id}/edit`)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card title="工作计划管理">
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
              placeholder="按月份筛选"
              onChange={(value) => handleFilterChange('month', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有月份</Option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <Option key={month} value={month}>
                  {month}月
                </Option>
              ))}
            </Select>
            <Select
              placeholder="按状态筛选"
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="">所有状态</Option>
              <Option value="planning">计划中</Option>
              <Option value="executing">执行中</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={workPlans}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default WorkPlanList
