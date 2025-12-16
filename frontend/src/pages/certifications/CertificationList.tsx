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
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Certification {
  id: string
  distributorId: string
  certType: 'product' | 'sales' | 'technical' | 'compliance'
  certificationName: string
  certificationLevel: string
  issueDate: string
  expiryDate: string
  verificationCode: string
  status: 'active' | 'expired' | 'revoked'
  score: number | null
  certifiedBy: string
  notes: string | null
  documentUrl: string | null
  createdAt: string
  distributor?: {
    id: string
    name: string
    tier: string
  }
}

interface Filters {
  distributorId?: string
  certType?: string
  status?: string
  search?: string
}

const certTypeMap: Record<string, { text: string; color: string }> = {
  product: { text: '产品认证', color: 'blue' },
  sales: { text: '销售认证', color: 'green' },
  technical: { text: '技术认证', color: 'purple' },
  compliance: { text: '合规认证', color: 'orange' },
}

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '有效', color: 'success' },
  expired: { text: '已过期', color: 'default' },
  revoked: { text: '已撤销', color: 'error' },
}

export default function CertificationList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Filters>({})

  const fetchCertifications = async (page = 1, limit = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const params: any = {
        page,
        limit,
        ...currentFilters,
      }

      const response = await axios.get(`${API_BASE_URL}/certifications`, {
        params,
      })

      if (response.data.success) {
        setCertifications(response.data.certifications)
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch certifications:', error)
      message.error(error.response?.data?.error || '获取认证列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCertifications()
  }, [])

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchCertifications(newPagination.current, newPagination.pageSize)
  }

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, search: value || undefined }
    setFilters(newFilters)
    fetchCertifications(1, pagination.pageSize, newFilters)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchCertifications(1, pagination.pageSize, newFilters)
  }

  const columns: ColumnsType<Certification> = [
    {
      title: '认证名称',
      dataIndex: 'certificationName',
      key: 'certificationName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分销商',
      key: 'distributor',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Certification) => record.distributor?.name || '-',
    },
    {
      title: '认证类型',
      dataIndex: 'certType',
      key: 'certType',
      width: 100,
      render: (type: string) => (
        <Tag color={certTypeMap[type]?.color}>{certTypeMap[type]?.text}</Tag>
      ),
    },
    {
      title: '认证级别',
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 100,
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number | null) => (score !== null ? score : '-'),
    },
    {
      title: '颁发日期',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '到期日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
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
      title: '验证码',
      dataIndex: 'verificationCode',
      key: 'verificationCode',
      width: 150,
      ellipsis: true,
    },
    {
      title: '颁发人',
      dataIndex: 'certifiedBy',
      key: 'certifiedBy',
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: Certification) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/certifications/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/certifications/${record.id}/edit`)}
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
        title="认证管理"
        extra={
          <Space>
            <Button
              icon={<SafetyOutlined />}
              onClick={() => navigate('/certifications/verify')}
            >
              验证认证
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/certifications/create')}
            >
              新建认证
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Search
              placeholder="搜索认证名称或验证码"
              allowClear
              style={{ width: 250 }}
              onSearch={handleSearch}
            />
            <Select
              placeholder="认证类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('certType', value)}
            >
              <Option value="product">产品认证</Option>
              <Option value="sales">销售认证</Option>
              <Option value="technical">技术认证</Option>
              <Option value="compliance">合规认证</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Option value="active">有效</Option>
              <Option value="expired">已过期</Option>
              <Option value="revoked">已撤销</Option>
            </Select>
          </Space>

          <Table
            columns={columns}
            dataSource={certifications}
            rowKey="id"
            loading={loading}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: 1600 }}
          />
        </Space>
      </Card>
    </div>
  )
}
