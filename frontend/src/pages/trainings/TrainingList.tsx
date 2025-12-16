import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  message,
  Tag,
  DatePicker,
} from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { Search } = Input
const { RangePicker } = DatePicker
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Training {
  id: string
  title: string
  description: string
  trainingType: 'product' | 'sales' | 'technical' | 'compliance' | 'other'
  format: 'online' | 'offline' | 'hybrid'
  instructor: string
  startDate: string
  endDate: string
  capacity: number
  currentParticipants: number
  location: string | null
  materialsUrl: string | null
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
  createdBy: string
  createdAt: string
  creator?: {
    id: string
    username: string
    name: string
  }
}

interface Filters {
  search?: string
  trainingType?: string
  format?: string
  status?: string
  startDate?: string
  endDate?: string
}

const trainingTypeMap: Record<string, { text: string; color: string }> = {
  product: { text: '产品培训', color: 'blue' },
  sales: { text: '销售培训', color: 'green' },
  technical: { text: '技术培训', color: 'purple' },
  compliance: { text: '合规培训', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const formatMap: Record<string, { text: string; color: string }> = {
  online: { text: '线上', color: 'blue' },
  offline: { text: '线下', color: 'green' },
  hybrid: { text: '混合', color: 'purple' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  planned: { text: '计划中', color: 'default' },
  ongoing: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'error' },
}

export default function TrainingList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Filters>({})

  const fetchTrainings = async (page = 1, limit = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const params: any = {
        page,
        limit,
        ...currentFilters,
      }

      const response = await axios.get(`${API_BASE_URL}/trainings`, {
        params,
      })

      if (response.data.success) {
        setTrainings(response.data.trainings)
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch trainings:', error)
      message.error(error.response?.data?.error || '获取培训列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrainings()
  }, [])

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchTrainings(newPagination.current, newPagination.pageSize)
  }

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, search: value || undefined }
    setFilters(newFilters)
    fetchTrainings(1, pagination.pageSize, newFilters)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchTrainings(1, pagination.pageSize, newFilters)
  }

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const newFilters = {
        ...filters,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      }
      setFilters(newFilters)
      fetchTrainings(1, pagination.pageSize, newFilters)
    } else {
      const newFilters = { ...filters, startDate: undefined, endDate: undefined }
      setFilters(newFilters)
      fetchTrainings(1, pagination.pageSize, newFilters)
    }
  }

  const columns: ColumnsType<Training> = [
    {
      title: '培训名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'trainingType',
      key: 'trainingType',
      width: 100,
      render: (type: string) => (
        <Tag color={trainingTypeMap[type]?.color}>{trainingTypeMap[type]?.text}</Tag>
      ),
    },
    {
      title: '形式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format: string) => (
        <Tag color={formatMap[format]?.color}>{formatMap[format]?.text}</Tag>
      ),
    },
    {
      title: '讲师',
      dataIndex: 'instructor',
      key: 'instructor',
      width: 100,
    },
    {
      title: '开始时间',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '结束时间',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '人数',
      key: 'participants',
      width: 100,
      render: (_: any, record: Training) => (
        <span>
          {record.currentParticipants}/{record.capacity}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '创建人',
      key: 'creator',
      width: 100,
      render: (_: any, record: Training) => record.creator?.name || '-',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: Training) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/trainings/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/trainings/${record.id}/edit`)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="培训管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/trainings/create')}>
            新建培训
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Search
              placeholder="搜索培训名称或描述"
              allowClear
              style={{ width: 250 }}
              onSearch={handleSearch}
            />
            <Select
              placeholder="培训类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('trainingType', value)}
            >
              <Option value="product">产品培训</Option>
              <Option value="sales">销售培训</Option>
              <Option value="technical">技术培训</Option>
              <Option value="compliance">合规培训</Option>
              <Option value="other">其他</Option>
            </Select>
            <Select
              placeholder="培训形式"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('format', value)}
            >
              <Option value="online">线上</Option>
              <Option value="offline">线下</Option>
              <Option value="hybrid">混合</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="planned">计划中</Option>
              <Option value="ongoing">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              onChange={handleDateRangeChange}
            />
          </Space>

          <Table
            columns={columns}
            dataSource={trainings}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>
    </div>
  )
}
