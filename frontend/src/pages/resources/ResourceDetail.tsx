import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, message, Spin, Image } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import axios from '@/utils/axios'
import dayjs from 'dayjs'

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
  updatedAt: string
  creator?: {
    id: string
    username: string
    name: string
  }
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

export default function ResourceDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [resource, setResource] = useState<Resource | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const fetchResource = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/resources/${id}`)

      if (response.data.success) {
        setResource(response.data.resource)
        await axios.post(`${API_BASE_URL}/resources/${id}/view`)
      }
    } catch (error: any) {
      console.error('Failed to fetch resource:', error)
      message.error(error.response?.data?.error || '获取资料详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResource()
  }, [id])

  const handleDownload = async () => {
    if (!resource) return

    try {
      await axios.post(`${API_BASE_URL}/resources/${id}/download`)
      window.open(resource.fileUrl, '_blank', 'noopener,noreferrer')
      message.success('正在下载...')
    } catch (error: any) {
      console.error('Failed to track download:', error)
      message.error(error.response?.data?.error || '下载失败')
    }
  }

  if (loading || !resource) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/resources')}>
              返回
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/resources/${id}/edit`)}>
              编辑
            </Button>
          </Space>
        </Card>

        <Card title="资料信息">
          {resource.thumbnailUrl && (
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <Image
                src={resource.thumbnailUrl}
                alt={resource.title}
                style={{ maxWidth: '100%', maxHeight: 300 }}
              />
            </div>
          )}

          <Descriptions column={2} bordered>
            <Descriptions.Item label="资料名称" span={2}>
              {resource.title}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {resource.description}
            </Descriptions.Item>
            <Descriptions.Item label="资料类型">
              <Tag color={resourceTypeMap[resource.resourceType]?.color}>
                {resourceTypeMap[resource.resourceType]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="资料分类">
              <Tag color={categoryMap[resource.category]?.color}>
                {categoryMap[resource.category]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="访问等级">
              <Tag color={accessLevelMap[resource.accessLevel]?.color}>
                {accessLevelMap[resource.accessLevel]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {formatFileSize(resource.fileSize)}
            </Descriptions.Item>
            <Descriptions.Item label="下载次数">{resource.downloadCount}</Descriptions.Item>
            <Descriptions.Item label="浏览次数">{resource.viewCount}</Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {resource.tags.map((tag) => (
                <Tag key={tag} style={{ marginBottom: 4 }}>
                  {tag}
                </Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="文件链接" span={2}>
              <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                {resource.fileUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="创建人">{resource.creator?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(resource.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {dayjs(resource.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  )
}
