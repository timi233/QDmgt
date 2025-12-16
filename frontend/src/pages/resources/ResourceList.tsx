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
  DownloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

interface Resource {
  id: string
  title: string
  description: string
  resourceType: 'document' | 'video' | 'image' | 'template' | 'other'
  category: 'product' | 'marketing' | 'training' | 'compliance' | 'other'
  fileUrl: string
  thumbnailUrl: string | null
  fileSize: number
  accessLevel: 'bronze' | 'silver' | 'gold' | 'platinum'
  downloadCount: number
  viewCount: number
  tags: string[]
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
  resourceType?: string
  category?: string
  accessLevel?: string
}

const resourceTypeMap: Record<string, { text: string; color: string }> = {
  document: { text: '文档', color: 'blue' },
  video: { text: '视频', color: 'purple' },
  image: { text: '图片', color: 'green' },
  template: { text: '模板', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const categoryMap: Record<string, { text: string; color: string }> = {
  product: { text: '产品资料', color: 'blue' },
  marketing: { text: '营销资料', color: 'green' },
  training: { text: '培训资料', color: 'purple' },
  compliance: { text: '合规资料', color: 'orange' },
  other: { text: '其他', color: 'default' },
}

const accessLevelMap: Record<string, { text: string; color: string }> = {
  bronze: { text: '青铜', color: 'default' },
  silver: { text: '白银', color: 'cyan' },
  gold: { text: '黄金', color: 'gold' },
  platinum: { text: '铂金', color: 'purple' },
}

export default function ResourceList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })
  const [filters, setFilters] = useState<Filters>({})

  const fetchResources = async (page = 1, limit = 20, currentFilters = filters) => {
    setLoading(true)
    try {
      const params: any = {
        page,
        limit,
        ...currentFilters,
      }

      const response = await axios.get(`${API_BASE_URL}/resources`, { params })

      if (response.data.success) {
        setResources(response.data.resources)
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.limit,
          total: response.data.pagination.total,
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch resources:', error)
      message.error(error.response?.data?.error || '获取资料列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchResources(newPagination.current, newPagination.pageSize)
  }

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, search: value || undefined }
    setFilters(newFilters)
    fetchResources(1, pagination.pageSize, newFilters)
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchResources(1, pagination.pageSize, newFilters)
  }

  const handleDownload = async (id: string, fileUrl: string, title: string) => {
    try {
      await axios.post(`${API_BASE_URL}/resources/${id}/download`)
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
      message.success('正在下载...')
    } catch (error: any) {
      console.error('Failed to track download:', error)
      message.error(error.response?.data?.error || '下载失败')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const columns: ColumnsType<Resource> = [
    {
      title: '资料名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 100,
      render: (type: string) => (
        <Tag color={resourceTypeMap[type]?.color}>{resourceTypeMap[type]?.text}</Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={categoryMap[category]?.color}>{categoryMap[category]?.text}</Tag>
      ),
    },
    {
      title: '访问等级',
      dataIndex: 'accessLevel',
      key: 'accessLevel',
      width: 100,
      render: (level: string) => (
        <Tag color={accessLevelMap[level]?.color}>{accessLevelMap[level]?.text}</Tag>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '下载/浏览',
      key: 'stats',
      width: 120,
      render: (_: any, record: Resource) => (
        <span>
          <DownloadOutlined /> {record.downloadCount} / <EyeOutlined /> {record.viewCount}
        </span>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <>
          {tags.slice(0, 2).map((tag) => (
            <Tag key={tag} style={{ marginBottom: 4 }}>
              {tag}
            </Tag>
          ))}
          {tags.length > 2 && <Tag>+{tags.length - 2}</Tag>}
        </>
      ),
    },
    {
      title: '创建人',
      key: 'creator',
      width: 100,
      render: (_: any, record: Resource) => record.creator?.name || '-',
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
      width: 160,
      render: (_: any, record: Resource) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.id, record.fileUrl, record.title)}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/resources/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/resources/${record.id}/edit`)}
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
        title="资料库"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/resources/create')}
          >
            新建资料
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Search
              placeholder="搜索资料名称或标签"
              allowClear
              style={{ width: 250 }}
              onSearch={handleSearch}
            />
            <Select
              placeholder="资料类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('resourceType', value)}
            >
              <Option value="document">文档</Option>
              <Option value="video">视频</Option>
              <Option value="image">图片</Option>
              <Option value="template">模板</Option>
              <Option value="other">其他</Option>
            </Select>
            <Select
              placeholder="资料分类"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('category', value)}
            >
              <Option value="product">产品资料</Option>
              <Option value="marketing">营销资料</Option>
              <Option value="training">培训资料</Option>
              <Option value="compliance">合规资料</Option>
              <Option value="other">其他</Option>
            </Select>
            <Select
              placeholder="访问等级"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => handleFilterChange('accessLevel', value)}
            >
              <Option value="bronze">青铜</Option>
              <Option value="silver">白银</Option>
              <Option value="gold">黄金</Option>
              <Option value="platinum">铂金</Option>
            </Select>
          </Space>

          <Table
            columns={columns}
            dataSource={resources}
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
