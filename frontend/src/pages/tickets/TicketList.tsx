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
} from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Ticket {
  id: string
  ticketNumber: string
  distributorId: string
  ticketType: 'technical' | 'product' | 'billing' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  subject: string
  description: string
  assignedTo: string | null
  resolution: string | null
  createdBy: string
  createdAt: string
  commentCount?: number
  distributor?: {
    id: string
    name: string
    region: string
  }
  creator?: {
    id: string
    username: string
    name: string
  }
  assignee?: {
    id: string
    username: string
    name: string
  } | null
}

interface Filters {
  distributorId?: string
  ticketType?: string
  priority?: string
  status?: string
  assignedTo?: string
  createdBy?: string
}

const ticketTypeMap: Record<string, { text: string; color: string }> = {
  technical: { text: '技术支持', color: 'blue' },
  product: { text: '产品咨询', color: 'green' },
  billing: { text: '账单问题', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const priorityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'default' },
  medium: { text: '中', color: 'blue' },
  high: { text: '高', color: 'orange' },
  urgent: { text: '紧急', color: 'red' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  open: { text: '待处理', color: 'default' },
  assigned: { text: '已分配', color: 'cyan' },
  in_progress: { text: '处理中', color: 'processing' },
  pending: { text: '等待中', color: 'warning' },
  resolved: { text: '已解决', color: 'success' },
  closed: { text: '已关闭', color: 'default' },
}

export default function TicketList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Filters>({})

  const fetchTickets = async (page = 1, limit = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const params: any = {
        page,
        limit,
        ...currentFilters,
      }

      const response = await axios.get(`${API_BASE_URL}/tickets`, {
        params,
      })

      if (response.data.success) {
        setTickets(response.data.tickets)
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error)
      message.error(error.response?.data?.error || '获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchTickets(newPagination.current, newPagination.pageSize)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchTickets(1, pagination.pageSize, newFilters)
  }

  const columns: ColumnsType<Ticket> = [
    {
      title: '工单号',
      dataIndex: 'ticketNumber',
      key: 'ticketNumber',
      width: 140,
      fixed: 'left',
    },
    {
      title: '标题',
      dataIndex: 'subject',
      key: 'subject',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分销商',
      key: 'distributor',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Ticket) => record.distributor?.name || '-',
    },
    {
      title: '类型',
      dataIndex: 'ticketType',
      key: 'ticketType',
      width: 100,
      render: (type: string) => (
        <Tag color={ticketTypeMap[type]?.color}>{ticketTypeMap[type]?.text}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={priorityMap[priority]?.color}>{priorityMap[priority]?.text}</Tag>
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
      render: (_: any, record: Ticket) => record.creator?.name || '-',
    },
    {
      title: '处理人',
      key: 'assignee',
      width: 100,
      render: (_: any, record: Ticket) => record.assignee?.name || '-',
    },
    {
      title: '评论',
      key: 'comments',
      width: 80,
      render: (_: any, record: Ticket) => record.commentCount || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: Ticket) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tickets/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/tickets/${record.id}/edit`)}
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
        title="支持工单"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tickets/create')}>
            新建工单
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Select
              placeholder="工单类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('ticketType', value)}
            >
              <Option value="technical">技术支持</Option>
              <Option value="product">产品咨询</Option>
              <Option value="billing">账单问题</Option>
              <Option value="other">其他</Option>
            </Select>
            <Select
              placeholder="优先级"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('priority', value)}
            >
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="open">待处理</Option>
              <Option value="assigned">已分配</Option>
              <Option value="in_progress">处理中</Option>
              <Option value="pending">等待中</Option>
              <Option value="resolved">已解决</Option>
              <Option value="closed">已关闭</Option>
            </Select>
          </Space>

          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1500 }}
          />
        </Space>
      </Card>
    </div>
  )
}
