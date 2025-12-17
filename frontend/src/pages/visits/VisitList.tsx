import React, { useEffect, useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  Tag,
  message,
  DatePicker,
  Typography,
  Empty,
} from 'antd'
import { PlusOutlined, ReloadOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '@/utils/axios'
import dayjs, { Dayjs } from 'dayjs'
import { useDistributorOptions } from '../../hooks/useDistributorOptions'
import { formatRegion } from '@/utils/regionUtils'

const { RangePicker } = DatePicker
const { Option } = Select
const { Title } = Typography

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

type VisitType = 'onsite' | 'online' | 'phone' | 'meeting'

interface VisitRecord {
  id: string
  distributorId: string
  visitDate: string
  visitType: VisitType
  purpose: string
  participants?: string
  keyDiscussions?: string
  feedback?: string
  nextSteps?: string
  satisfactionScore?: number
  distributor: {
    id: string
    name: string
    region: string
    channelTier?: string
  }
  visitor: {
    id: string
    name: string
    username: string
  }
  createdAt: string
}

interface VisitResponse {
  visits: VisitRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const visitTypeMeta: Record<
  VisitType,
  {
    label: string
    color: string
  }
> = {
  onsite: { label: '现场拜访', color: 'blue' },
  online: { label: '线上会议', color: 'purple' },
  phone: { label: '电话沟通', color: 'gold' },
  meeting: { label: '商务会议', color: 'green' },
}

const VisitList: React.FC = () => {
  const navigate = useNavigate()
  const { options: distributorOptions, loading: distributorLoading } = useDistributorOptions()
  const [loading, setLoading] = useState(false)
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [filters, setFilters] = useState<{
    distributorId?: string
    visitType?: VisitType
    startDate?: string
    endDate?: string
  }>({})

  const getAuthHeaders = () => {
    return {
    }
  }

  const fetchVisits = async (page = 1, limit = pagination.pageSize, currentFilters = filters) => {
    setLoading(true)
    try {
      const response = await axios.get<VisitResponse>(`${API_BASE_URL}/visits`, {
        headers: getAuthHeaders(),
        params: {
          page,
          limit,
          ...currentFilters,
        },
      })

      setVisits(response.data.visits)
      setPagination({
        current: response.data.pagination.page,
        pageSize: response.data.pagination.limit,
        total: response.data.pagination.total,
      })
    } catch (error) {
      console.error('Fetch visits error:', error)
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.error || '获取拜访记录失败')
      } else {
        message.error('获取拜访记录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisits(1, pagination.pageSize)
  }, [])

  const handleTableChange = (newPagination: TableChangeConfig) => {
    fetchVisits(newPagination.current || 1, newPagination.pageSize || pagination.pageSize)
  }

  const handleDistributorChange = (value?: string) => {
    const newFilters = { ...filters, distributorId: value || undefined }
    setFilters(newFilters)
    fetchVisits(1, pagination.pageSize, newFilters)
  }

  const handleVisitTypeChange = (value?: VisitType) => {
    const newFilters = { ...filters, visitType: value || undefined }
    setFilters(newFilters)
    fetchVisits(1, pagination.pageSize, newFilters)
  }

  const handleDateRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    const [start, end] = dates || []
    const newFilters = {
      ...filters,
      startDate: start ? start.startOf('day').toISOString() : undefined,
      endDate: end ? end.endOf('day').toISOString() : undefined,
    }
    setFilters(newFilters)
    fetchVisits(1, pagination.pageSize, newFilters)
  }

  const columns = [
    {
      title: '拜访日期',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 140,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '分销商',
      dataIndex: ['distributor', 'name'],
      key: 'distributor',
      width: 180,
      render: (_: unknown, record: VisitRecord) => (
        <div>
          <div>{record.distributor?.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{formatRegion(record.distributor?.region)}</div>
        </div>
      ),
    },
    {
      title: '拜访类型',
      dataIndex: 'visitType',
      key: 'visitType',
      width: 120,
      render: (type: VisitType) => (
        <Tag color={visitTypeMeta[type]?.color || 'default'}>{visitTypeMeta[type]?.label || type}</Tag>
      ),
    },
    {
      title: '拜访目的',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
    },
    {
      title: '满意度',
      dataIndex: 'satisfactionScore',
      key: 'satisfactionScore',
      width: 120,
      render: (score: number | undefined) =>
        typeof score === 'number' ? (
          <Tag color={score >= 4 ? 'green' : score >= 3 ? 'blue' : 'orange'}>{score.toFixed(1)} / 5</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '拜访人',
      dataIndex: ['visitor', 'name'],
      key: 'visitor',
      width: 140,
      render: (_: unknown, record: VisitRecord) => record.visitor?.name || record.visitor?.username,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: VisitRecord) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/visits/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              拜访记录
            </Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchVisits(pagination.current, pagination.pageSize)}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/visits/create')}>
                新建拜访
              </Button>
            </Space>
          </div>

          <Space size="middle" wrap>
            <Select
              placeholder="选择分销商"
              loading={distributorLoading}
              style={{ minWidth: 200 }}
              allowClear
              onChange={(value) => handleDistributorChange(value)}
              value={filters.distributorId}
              showSearch
              optionFilterProp="label"
              options={distributorOptions}
            />
            <Select
              placeholder="拜访类型"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => handleVisitTypeChange(value as VisitType)}
              value={filters.visitType}
            >
              <Option value="onsite">现场拜访</Option>
              <Option value="online">线上会议</Option>
              <Option value="phone">电话沟通</Option>
              <Option value="meeting">商务会议</Option>
            </Select>
            <RangePicker
              onChange={handleDateRangeChange}
              value={
                filters.startDate && filters.endDate
                  ? [dayjs(filters.startDate), dayjs(filters.endDate)]
                  : undefined
              }
              style={{ minWidth: 260 }}
            />
          </Space>
        </div>

        {visits.length === 0 && !loading ? (
          <Empty
            image={<CalendarOutlined style={{ fontSize: 48 }} />}
            description="暂无拜访记录"
            style={{ marginTop: 32 }}
          />
        ) : (
          <Table
            style={{ marginTop: 16 }}
            rowKey="id"
            columns={columns}
            dataSource={visits}
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </div>
  )
}

export default VisitList
interface TableChangeConfig {
  current?: number
  pageSize?: number
}
